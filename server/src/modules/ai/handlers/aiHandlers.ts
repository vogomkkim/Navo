import { FastifyRequest, FastifyReply } from 'fastify';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/db';
import {
  events,
  projects,
  componentDefinitions,
  pages,
  components,
} from '@/db';
import { eq, inArray } from 'drizzle-orm';
import {
  storePages,
  storeComponentDefinitions,
  storePageComponents,
  assignLayoutsForPages,
} from '@/modules/projects/persist';
import { generateProjectPlan } from '../agents/agents.service';
import type { ProjectRequest } from '@/core/types/project';
import { contextManager, UserContext } from '@/core/contextManager';
import { intentAnalyzer } from '@/core/intentAnalyzer';
import { EnhancedPrompt } from '@/core/types/intent';
import { actionRouter, ActionResult } from '@/core/actionRouter';
import { safeJsonParse } from '../utils/jsonRefiner';

import { generateProjectContent } from '../services/generation';
import { deriveProjectName } from '../utils/prompt';

// FastifyRequest 타입 확장
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function handleAiCommand(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { command, projectId } = request.body as any;
    const userId = request.userId;

    if (!command) {
      reply.status(400).send({ error: 'Command is required' });
      return;
    }

    // Process AI command and generate response
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(command);
    const response = result.response;
    const text = response.text();

    // Store the AI interaction
    await db.insert(events).values({
      projectId: projectId || null,
      userId: userId!,
      eventType: 'ai_command',
      eventData: { command, response: text },
    });

    reply.send({ response: text });
  } catch (error) {
    console.error('Error processing AI command:', error);
    reply.status(500).send({ error: 'Failed to process AI command' });
  }
}

export async function generateAiSuggestion(currentLayout: any): Promise<any> {
  console.log('[AI] Entering generateAiSuggestion', { currentLayout });
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are an AI assistant that suggests improvements for web page layouts.
Analyze the provided currentLayout (a JSON object representing the page components).
Suggest ONE actionable improvement. The suggestion should be concise and focus on a single change.
The suggestion should be in the following JSON format:
{
  "type": "style" | "content" | "component", // Type of suggestion
  "content": { // The actual change to apply, matching the structure expected by the frontend
    "type": "update" | "add" | "remove",
    "id": "component_id", // If updating/removing
    "payload": { // The data for the change
      // e.g., for style update: { props: { style: { color: "blue" } } }
      // e.g., for content update: { props: { headline: "New Headline" } }
      // e.g., for add: { id: "new_id", type: "ComponentType", props: {} }
    },
    "description": "A brief, human-readable description of the suggestion."
  }
}

Example:
If the layout has a Header, suggest changing its background color.
If the layout has a Hero, suggest a different CTA text.

Current Layout: ${JSON.stringify(currentLayout, null, 2)}

Your suggestion:
`;

  try {
    console.log('[AI] Sending prompt to Gemini:', prompt);
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();
    console.log('[AI] Gemini Suggestion Raw Response:', text);

    let parsedSuggestion;
    try {
      console.log('[AI] Attempting to parse Gemini response:', text);
      parsedSuggestion = await safeJsonParse(text);
      console.log(
        '[AI] Successfully parsed Gemini response.',
        parsedSuggestion
      );
    } catch (parseError) {
      console.error(
        '[AI] Failed to parse Gemini suggestion as JSON:',
        parseError
      );
      console.error('[AI] Raw Gemini suggestion text:', text);
      throw new Error('AI suggestion was not valid JSON.');
    }
    console.log('[AI] Exiting generateAiSuggestion - Success');
    return parsedSuggestion;
  } catch (err) {
    console.error('[AI] Error calling Gemini API for suggestion:', err);
    console.log('[AI] Exiting generateAiSuggestion - Failure');
    throw new Error('Failed to get suggestion from AI.');
  }
}

export async function handleGenerateProject(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { projectName, projectDescription, requirements } =
      request.body as any;
    const userId = request.userId;
    if (!userId) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }
    if (!projectName) {
      reply.status(400).send({ error: 'Project name is required.' });
      return;
    }

    // requirements가 있으면 저장, 없으면 projectDescription 사용
    const projectRequirements =
      requirements || projectDescription || projectName;

    const created = await db
      .insert(projects)
      .values({
        name: projectName as string,
        ownerId: userId!,
        description: projectDescription || projectName,
        requirements: projectRequirements,
      })
      .returning();

    const projectId = created[0].id;

    // AI를 사용하여 프로젝트 콘텐츠 생성
    console.log('프로젝트 생성 시 AI 콘텐츠 생성 시작...');
    const generatedContent = await generateProjectContent(projectRequirements);
    console.log('생성된 콘텐츠:', generatedContent);

    // 생성된 내용을 데이터베이스에 저장 (트랜잭션으로 안전하게 처리)
    console.log('페이지 및 컴포넌트 저장 시작...');

    const result = await db.transaction(async (tx) => {
      // 새 데이터 생성
      const savedPages = await storePages(
        tx,
        projectId,
        generatedContent.pages
      );
      // Step 2: store component definitions
      const savedComponentDefinitions = await storeComponentDefinitions(
        tx,
        projectId,
        generatedContent.components
      );

      // Step 3: assign layouts for pages (DAG step after pages exist)
      await assignLayoutsForPages(tx, savedPages);

      // Step 4: instantiate components per page
      const savedComponents = await storePageComponents(
        tx,
        savedPages,
        savedComponentDefinitions
      );

      return { savedPages, savedComponents, savedComponentDefinitions };
    });

    console.log('저장된 페이지:', result.savedPages);
    console.log('저장된 컴포넌트:', result.savedComponents);

    reply.send({
      ok: true,
      message: 'Project created with AI-generated content.',
      projectId: projectId,
      generatedStructure: {
        pages: result.savedPages,
        componentDefinitions: result.savedComponentDefinitions,
        components: result.savedComponents,
      },
    });
  } catch (error) {
    console.error('Error generating project:', error);
    reply.status(500).send({ error: 'Failed to generate project' });
  }
}

/**
 * Multi-agent chat entrypoint: takes a natural language chat message,
 * converts it into a ProjectRequest, orchestrates MasterDeveloperAgent,
 * and returns a structured multi-agent response for the chat UI.
 */
export async function handleMultiAgentChat(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = request.userId;
    if (!userId) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }

    const { message, context } = request.body as {
      message?: string;
      context?: {
        projectId?: string;
        sessionId?: string;
        userAgent?: string;
        url?: string;
      };
    };

    if (
      !message ||
      typeof message !== 'string' ||
      message.trim().length === 0
    ) {
      reply.status(400).send({ error: 'Message is required' });
      return;
    }

    // ContextManager를 사용하여 사용자 컨텍스트 조회 또는 생성
    let userContext: UserContext;
    try {
      userContext = await contextManager.getOrCreateContext(userId);
    } catch (error) {
      console.error('Error getting or creating user context:', error);
      throw new Error('Failed to get or create user context');
    }

    const sessionId = userContext.sessionId; // DB에서 생성된 UUID 사용

    // 최근 메시지 조회 (컨텍스트 구성용)
    const recentMessages = await contextManager.getMessages(sessionId, 3);

    // IntentAnalyzer를 사용하여 메시지 향상
    const enhancedPrompt: EnhancedPrompt = await intentAnalyzer.enhance(
      message,
      userContext,
      recentMessages
    );

    // 사용자 메시지를 대화 히스토리에 추가
    await contextManager.addMessage(
      sessionId,
      userId,
      'user',
      { message },
      undefined,
      undefined,
      {
        source: 'multi_agent_chat',
        enhancedPrompt: enhancedPrompt,
      }
    );

    // ActionRouter를 사용하여 적절한 핸들러 선택 및 실행
    const selectedHandler = actionRouter.route(enhancedPrompt);
    const routingInfo = actionRouter.getRoutingInfo(enhancedPrompt);

    console.log(`라우팅 정보:`, {
      intent: enhancedPrompt.intent.type,
      target: enhancedPrompt.target.type,
      action: enhancedPrompt.action.type,
      selectedHandler: selectedHandler?.name,
      matchedRule: routingInfo.matchedRule?.description,
    });

    let actionResult: ActionResult;
    if (selectedHandler) {
      // 선택된 핸들러로 처리
      actionResult = await selectedHandler.execute(
        enhancedPrompt,
        userContext,
        sessionId
      );
    } else {
      // 기본 처리
      actionResult = {
        success: false,
        message: '적절한 핸들러를 찾을 수 없습니다.',
        error: 'No handler found',
      };
    }

    // 모호한 표현인 경우 구체화 제안
    if (enhancedPrompt.intent.isVague && enhancedPrompt.intent.clarification) {
      console.log(`모호한 표현 감지: ${enhancedPrompt.originalMessage}`);
      console.log(`구체화 제안: ${enhancedPrompt.intent.clarification}`);
    }

    // ActionRouter 결과를 기반으로 프로젝트 요청 생성
    const req: ProjectRequest | null =
      await buildProjectRequestFromActionResult(
        actionResult,
        enhancedPrompt,
        userContext,
        sessionId
      );

    if (req) {
      const start = Date.now();

      // 컨텍스트 정보를 포함한 enhanced context
      const enhancedContext = {
        ...context,
        userId: userId,
        sessionId: sessionId,
        userContext: userContext,
        actionResult: actionResult,
      };

      const plan = await generateProjectPlan(req, enhancedContext);
      const totalExecutionTime = Date.now() - start;

      // 동적으로 에이전트 결과 생성
      const agentResults = [
        {
          name: 'Project Architect Agent',
          data: plan.architecture,
          action: '프로젝트 요구사항 분석 및',
        },
        {
          name: 'UI/UX Designer Agent',
          data: plan.uiDesign,
          action: 'UI/UX',
        },
        {
          name: 'Code Generator Agent',
          data: plan.codeStructure,
          action: '프로젝트 코드 구조',
        },
        {
          name: 'Development Guide Agent',
          data: plan.developmentGuide,
          action: '개발 가이드',
        },
      ];

      const agents = agentResults.map((result) => ({
        success: true,
        message: generateAgentSuccessMessage(result.name, result.action),
        agentName: result.name,
        status: 'completed' as const,
        data: result.data,
      }));

      // 어시스턴트 응답을 대화 히스토리에 추가
      const assistantMessage = generateSummaryMessage(
        agents.length,
        agents.length
      );
      await contextManager.addMessage(
        sessionId,
        userId,
        'assistant',
        { message: assistantMessage },
        undefined,
        undefined,
        {
          agents: agents.length,
          totalExecutionTime,
          source: 'multi_agent_chat',
          enhancedPrompt: enhancedPrompt,
        }
      );

      // 마지막 액션 업데이트
      await contextManager.updateLastAction(
        sessionId,
        userId,
        'multi_agent_chat',
        'project_generation',
        {
          success: true,
          agentsCount: agents.length,
        }
      );

      reply.send({
        success: true,
        agents,
        totalExecutionTime,
        summary: assistantMessage,
        sessionId: sessionId, // 클라이언트에 세션 ID 반환
        enhancedPrompt: {
          intent: enhancedPrompt.intent,
          target: enhancedPrompt.target,
          action: enhancedPrompt.action,
          enhancedMessage: enhancedPrompt.enhancedMessage,
          isVague: enhancedPrompt.intent.isVague,
          clarification: enhancedPrompt.intent.clarification,
        },
        actionRouter: {
          selectedHandler: selectedHandler?.name,
          matchedRule: routingInfo.matchedRule?.description,
          actionResult: {
            success: actionResult.success,
            message: actionResult.message,
            nextAction: actionResult.nextAction,
          },
        },
      });
    } else {
      // 프로젝트 생성이 필요하지 않은 경우 일반 대화 응답
      const assistantMessage = generateGeneralResponse(
        actionResult,
        enhancedPrompt
      );
      await contextManager.addMessage(
        sessionId,
        userId,
        'assistant',
        { message: assistantMessage },
        undefined,
        undefined,
        {
          agents: 0,
          totalExecutionTime: 0,
          source: 'multi_agent_chat',
          enhancedPrompt: enhancedPrompt,
        }
      );

      reply.send({
        success: true,
        agents: [],
        totalExecutionTime: 0,
        summary: assistantMessage,
        sessionId: sessionId,
        enhancedPrompt: {
          intent: enhancedPrompt.intent,
          target: enhancedPrompt.target,
          action: enhancedPrompt.action,
          enhancedMessage: enhancedPrompt.enhancedMessage,
          isVague: enhancedPrompt.intent.isVague,
          clarification: enhancedPrompt.intent.clarification,
        },
        actionRouter: {
          selectedHandler: selectedHandler?.name,
          matchedRule: routingInfo.matchedRule?.description,
          actionResult: {
            success: actionResult.success,
            message: actionResult.message,
            nextAction: actionResult.nextAction,
          },
        },
      });
    }
  } catch (error) {
    console.error('Error handling multi-agent chat:', error);
    reply.status(500).send({
      success: false,
      agents: [
        {
          success: false,
          message: generateErrorMessage('Master Developer', error),
          agentName: 'Master Developer',
          status: 'error',
        },
      ],
      totalExecutionTime: 0,
      summary: generateSummaryMessage(1, 0),
    });
  }
}

function buildProjectRequestFromMessage(message: string): ProjectRequest {
  const lower = message.toLowerCase();
  let type: ProjectRequest['type'] = 'web';
  if (lower.includes('mobile') || lower.includes('앱')) type = 'mobile';
  if (lower.includes('api')) type = 'api';
  if (lower.includes('fullstack') || lower.includes('풀스택'))
    type = 'fullstack';

  const features: string[] = [];
  if (/(login|로그인)/i.test(message)) features.push('authentication');
  if (/(payment|결제)/i.test(message)) features.push('payment');
  if (/(realtime|실시간)/i.test(message)) features.push('realtime');
  if (/(chat|채팅)/i.test(message)) features.push('chat');
  if (/(blog|블로그)/i.test(message)) features.push('blog');
  if (/(auction|경매)/i.test(message)) features.push('auction');

  const name = deriveProjectName(message);

  return {
    name,
    description: message.trim(),
    type,
    features: features.length > 0 ? features : ['core'],
    technology: undefined,
    complexity: 'medium',
    estimatedTime: undefined,
  };
}

async function buildProjectRequestFromActionResult(
  actionResult: ActionResult,
  enhancedPrompt: EnhancedPrompt,
  _userContext: UserContext,
  _sessionId: string
): Promise<ProjectRequest | null> {
  // 프로젝트 생성이 필요한 경우에만 ProjectRequest 생성
  const { intent, enhancedMessage } = enhancedPrompt;

  // 프로젝트 생성이 필요하지 않은 의도들
  const nonProjectIntents = ['question', 'complaint', 'general', 'code_review'];

  // 프로젝트 생성이 필요하지 않은 액션들
  const nonProjectActions = [
    'answer_question',
    'clarify_complaint',
    'suggest_improvement',
    'general_conversation',
    'review_code',
  ];

  // 프로젝트 생성이 필요하지 않은 경우 null 반환
  if (
    nonProjectIntents.includes(intent.type) ||
    (actionResult.nextAction &&
      nonProjectActions.includes(actionResult.nextAction))
  ) {
    return null;
  }

  // 기본 프로젝트 요청 생성
  const baseRequest = buildProjectRequestFromMessage(enhancedMessage);

  // ActionRouter 결과를 반영한 요청 개선
  const enhancedRequest = { ...baseRequest };

  // ActionRouter 결과 메시지를 설명에 포함
  enhancedRequest.description = `${actionResult.message}\n\n의도: ${intent.description}\n요청: ${enhancedMessage}`;

  // ActionRouter 데이터를 활용한 요청 개선
  if (actionResult.data) {
    switch (actionResult.nextAction) {
      case 'create_project':
        enhancedRequest.description += `\n\n새 프로젝트 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
        if (actionResult.data.type) {
          enhancedRequest.type = actionResult.data.type as any;
        }
        if (actionResult.data.features) {
          enhancedRequest.features = Array.isArray(actionResult.data.features)
            ? actionResult.data.features
            : [actionResult.data.features];
        }
        break;

      case 'create_page':
        enhancedRequest.description += `\n\n새 페이지 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
        break;

      case 'create_component':
        enhancedRequest.description += `\n\n새 컴포넌트 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
        break;

      case 'modify_page':
        enhancedRequest.description += `\n\n페이지 수정 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
        break;

      case 'modify_component':
        enhancedRequest.description += `\n\n컴포넌트 수정 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
        break;

      case 'fix_bug':
        enhancedRequest.description += `\n\n버그 수정 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
        break;

      case 'implement_feature':
        enhancedRequest.description += `\n\n기능 구현 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
        break;

      default:
        enhancedRequest.description += `\n\n처리 정보: ${JSON.stringify(actionResult.data, null, 2)}`;
    }
  }

  // 컨텍스트 정보 추가
  if (enhancedPrompt.context.projectContext) {
    enhancedRequest.description += `\n\n${enhancedPrompt.context.projectContext}`;
  }
  if (enhancedPrompt.context.componentContext) {
    enhancedRequest.description += `\n\n${enhancedPrompt.context.componentContext}`;
  }

  return enhancedRequest;
}

import { generateVirtualPreview } from '../agents/agents.service';

export async function handleVirtualPreview(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { pageId, '*': filePath } = request.params as {
      pageId: string;
      '*': string;
    };

    if (!pageId || !filePath) {
      reply.status(400).send({ error: 'pageId and filePath are required.' });
      return;
    }

    const htmlContent = await generateVirtualPreview(pageId, `/${filePath}`);

    reply.type('text/html').send(htmlContent);
  } catch (error) {
    console.error('Error generating virtual preview:', error);
    reply.status(500).send({ error: 'Failed to generate virtual preview' });
  }
}

// 프로젝트 복구 핸들러
export async function handleProjectRecovery(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { projectId, action } = request.body as any;

    if (action === 'continue') {
      // 프로젝트 정보 조회
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
      });

      if (!project) {
        reply.status(404).send({ error: 'Project not found' });
        return;
      }

      // 프로젝트 요구사항 분석 (requirements 컬럼 우선 사용)
      const requirements =
        project.requirements || project.description || project.name;

      // AI를 사용하여 프로젝트 완성
      console.log('프로젝트 복구 시작:', { projectId, requirements });

      const generatedContent = await generateProjectContent(requirements);
      console.log('생성된 콘텐츠:', generatedContent);

      // 생성된 내용을 데이터베이스에 저장 (트랜잭션으로 안전하게 처리)
      console.log('페이지 및 컴포넌트 저장 시작...');

      const result = await db.transaction(async (tx) => {
        // 기존 데이터 삭제
        await tx.delete(pages).where(eq(pages.projectId, projectId));
        await tx
          .delete(componentDefinitions)
          .where(eq(componentDefinitions.projectId, projectId));

        // 새 데이터 생성
        const savedPages = await storePages(
          tx,
          projectId,
          generatedContent.pages
        );
        const savedComponentDefinitions = await storeComponentDefinitions(
          tx,
          projectId,
          generatedContent.components
        );

        // pages에 components 인스턴스 배치
        const savedComponents = await storePageComponents(
          tx,
          savedPages,
          savedComponentDefinitions
        );

        return { savedPages, savedComponents, savedComponentDefinitions };
      });

      console.log('저장된 페이지:', result.savedPages);
      console.log('저장된 컴포넌트:', result.savedComponents);

      reply.send({
        success: true,
        message: '프로젝트 복구 완료',
        generated: {
          pages: result.savedPages,
          componentDefinitions: result.savedComponentDefinitions,
          components: result.savedComponents,
        },
      });
    } else {
      reply.status(400).send({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error in project recovery:', error);
    reply.status(500).send({ error: '프로젝트 복구 실패' });
  }
}

// 프로젝트 구조 가져오기
export async function getProjectStructure(projectId: string) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new Error('Project not found');
  }

  const projectPages = await db.query.pages.findMany({
    where: eq(pages.projectId, projectId),
  });

  const projectComponentDefinitions =
    await db.query.componentDefinitions.findMany({
      where: eq(componentDefinitions.projectId, projectId),
    });

  // components는 pageId를 통해 간접적으로 가져와야 함
  const projectComponents = await db.query.components.findMany({
    where: inArray(
      components.pageId,
      projectPages.map((p) => p.id)
    ),
  });

  return {
    project,
    pages: projectPages,
    componentDefinitions: projectComponentDefinitions,
    components: projectComponents,
  };
}

// 메시지 템플릿 함수들
function generateAgentSuccessMessage(
  agentName: string,
  action: string
): string {
  const messages = {
    'Project Architect Agent': `${action} 아키텍처 설계를 완료했습니다.`,
    'UI/UX Designer Agent': `${action} UI/UX 인터페이스 설계를 완료했습니다.`,
    'Code Generator Agent': `${action} 코드 구조 생성을 완료했습니다.`,
    'Development Guide Agent': `${action} 개발 가이드를 작성했습니다.`,
    'Database Manager Agent': `${action} 데이터베이스 설계를 완료했습니다.`,
  };

  return (
    messages[agentName as keyof typeof messages] ||
    `${action} 작업을 완료했습니다.`
  );
}

function generateSummaryMessage(
  agentCount: number,
  successCount: number
): string {
  if (successCount === agentCount) {
    return `모든 에이전트(${agentCount}개)가 성공적으로 작업을 완료했습니다.`;
  } else {
    return `${successCount}/${agentCount} 에이전트가 성공적으로 작업을 완료했습니다.`;
  }
}

function generateGeneralResponse(
  actionResult: ActionResult,
  enhancedPrompt: EnhancedPrompt
): string {
  // ActionRouter 결과를 기반으로 적절한 응답 생성
  if (actionResult.success) {
    return actionResult.message;
  } else {
    return '죄송합니다. 요청을 처리하는 중에 문제가 발생했습니다.';
  }
}

function generateErrorMessage(agentName: string, error?: any): string {
  const baseMessages = {
    'Master Developer': 'Master Developer 처리 중 오류가 발생했습니다.',
    'Project Architect Agent': '아키텍처 설계 중 오류가 발생했습니다.',
    'UI/UX Designer Agent': 'UI/UX 설계 중 오류가 발생했습니다.',
    'Code Generator Agent': '코드 생성 중 오류가 발생했습니다.',
    'Development Guide Agent': '개발 가이드 작성 중 오류가 발생했습니다.',
    'Database Manager Agent': '데이터베이스 설계 중 오류가 발생했습니다.',
  };

  const baseMessage =
    baseMessages[agentName as keyof typeof baseMessages] ||
    '처리 중 오류가 발생했습니다.';

  if (error?.message) {
    return `${baseMessage} (${error.message})`;
  }

  return baseMessage;
}
