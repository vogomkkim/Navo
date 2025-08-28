import { FastifyRequest, FastifyReply } from 'fastify';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../db/db.js';
import {
  events,
  suggestions as suggestionsTable,
  projects as projectsTable,
  componentDefinitions,
  pages,
} from '../db/schema.js';
import { and, desc, eq, sql } from 'drizzle-orm';
import { scaffoldProject } from '../nodes/scaffoldProject.js'; // Added import
import { MasterDeveloperAgent } from '../agents/masterDeveloperAgent.js';
import { ProjectRequest } from '../core/masterDeveloper.js';

import createDOMPurify from 'dompurify';

// Initialize DOMPurify
const purify = createDOMPurify(); // Initialize without arguments for Node.js

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Utility: Create a URL/DB safe name from free text
 */
function slugifyName(input: string): string {
  const base = (input || 'custom-component')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  const clipped = base.slice(0, 48) || 'component';
  return clipped.replace(/^-+|-+$/g, '') || 'component';
}

/**
 * Validate a generated component definition object minimally
 */
function validateGeneratedComponentDef(obj: any): {
  ok: boolean;
  error?: string;
} {
  if (!obj || typeof obj !== 'object')
    return { ok: false, error: 'Invalid object' };
  const requiredStringFields = ['name', 'display_name', 'render_template'];
  for (const f of requiredStringFields) {
    if (typeof obj[f] !== 'string' || obj[f].trim() === '') {
      return { ok: false, error: `Missing or invalid field: ${f}` };
    }
  }
  if (obj.css_styles != null && typeof obj.css_styles !== 'string') {
    return { ok: false, error: 'css_styles must be a string if provided' };
  }
  if (obj.props_schema != null && typeof obj.props_schema !== 'object') {
    return { ok: false, error: 'props_schema must be an object if provided' };
  }
  return { ok: true };
}

function sanitizeLayout(layout: any): any {
  if (!layout) return layout;

  const sanitizedLayout = JSON.parse(JSON.stringify(layout)); // Deep copy

  function traverse(obj: any) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = purify.sanitize(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        traverse(obj[key]);
      }
    }
  }
  traverse(sanitizedLayout);
  return sanitizedLayout;
}

/**
 * Build prompt for natural language -> component definition JSON
 */
function buildNlToComponentPrompt(description: string): string {
  return `You are a UI component generator for a low-code website builder.
Given the user's natural language description, produce a SINGLE component definition as compact JSON.
Constraints:
- Output ONLY pure JSON, no backticks, no explanations.
- Use mustache-style placeholders in HTML template: {{id}}, {{propName}}.
- Keep HTML semantic and accessible.
- Include minimal, scoped CSS as one string (no <style> tag).
- props_schema must be a JSON Schema object describing editable props.

Required JSON shape:
{
  "name": string,                 // machine-safe unique name, PascalCase or simple-kebab is ok
  "display_name": string,         // human friendly
  "description": string,          // short description
  "category": string,             // e.g., "basic", "forms", "media"
  "props_schema": {
    "type": "object",
    "properties": { /* keys for props used in the template */ }
  },
  "render_template": string,      // HTML with {{placeholders}}, include data-id="{{id}}"
  "css_styles": string            // CSS rules targeting classes used in template
}

User description:
${description}
`;
}

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
      userId,
      type: 'ai_command',
      data: { command, response: text },
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
      if (text.startsWith('```json')) {
        text = text.replace(/```json\s*/, '').replace(/\s*```$/, '');
      }
      console.log('[AI] Attempting to parse Gemini response:', text);
      parsedSuggestion = JSON.parse(text);
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

export async function generateAndStoreDummySuggestion(
  projectId: string
): Promise<void> {
  console.log('[AI] Entering generateAndStoreDummySuggestion');
  try {
    // Fetch the current layout from the draft API to pass to the AI
    console.log('[AI] Fetching current layout from /api/draft');
    const draftRes = await fetch(
      `http://localhost:${process.env.PORT}/api/draft`
    );
    const draftData = await draftRes.json();
    const currentLayout = draftData?.draft?.layout;

    if (!currentLayout) {
      console.error('[AI] Could not fetch current layout for AI suggestion.');
      return;
    }
    console.log('[AI] Successfully fetched current layout.');

    console.log('[AI] Generating AI suggestion...');
    const aiSuggestion = await generateAiSuggestion(currentLayout);
    console.log('[AI] AI suggestion generated:', aiSuggestion);

    try {
      await db.insert(suggestionsTable).values({
        projectId,
        type: aiSuggestion.type,
        content: aiSuggestion.content,
      });
      console.log('[AI] AI-generated suggestion stored successfully.');
    } catch (err) {
      console.error('[AI] Error storing AI-generated suggestion:', err);
    }
  } catch (err: any) {
    console.error('[AI] Error in generateAndStoreDummySuggestion:', err);
  }
  console.log('[AI] Exiting generateAndStoreDummySuggestion');
}

export async function handleGetSuggestions(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { projectId, type, limit = 10, offset = 0 } = request.query as any;

    const rows = await db
      .select()
      .from(suggestionsTable)
      .where(
        sql`${
          projectId
            ? eq(suggestionsTable.projectId, projectId as string)
            : sql`true`
        } AND ${type ? eq(suggestionsTable.type, type as string) : sql`true`}`
      )
      .limit(Number(limit))
      .offset(Number(offset))
      .orderBy(desc(suggestionsTable.createdAt));

    reply.send({ suggestions: rows });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    reply.status(500).send({ error: 'Failed to fetch suggestions' });
  }
}

export async function handleGenerateDummySuggestion(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = request.userId;
    if (!userId) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }

    // Use latest project owned by user as target for dummy suggestion if available
    const latestProject = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(eq(projectsTable.ownerId, userId))
      .orderBy(desc(projectsTable.createdAt))
      .limit(1);

    const projectId = latestProject[0]?.id || 'dummy-project-id';
    await generateAndStoreDummySuggestion(projectId);
    reply.send({ ok: true, message: 'Dummy suggestion generated' });
  } catch (error) {
    console.error('Error generating dummy suggestion:', error);
    reply.status(500).send({ error: 'Failed to generate dummy suggestion' });
  }
}

export async function handleTestDbSuggestions(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(suggestionsTable)
      .limit(5)
      .orderBy(desc(suggestionsTable.createdAt));

    reply.send({ suggestions: rows });
  } catch (error) {
    console.error('Error fetching test suggestions:', error);
    reply.status(500).send({ error: 'Failed to fetch test suggestions' });
  }
}

export async function handleApplySuggestion(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { suggestionId } = request.body as any;

    const updated = await db
      .update(suggestionsTable)
      .set({ appliedAt: new Date() })
      .where(eq(suggestionsTable.id, suggestionId))
      .returning();

    reply.send({ suggestion: updated[0] });
  } catch (error) {
    console.error('Error applying suggestion:', error);
    reply.status(500).send({ error: 'Failed to apply suggestion' });
  }
}

export async function handleSeedDummyData(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = request.userId;
    if (!userId) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }

    // Create a test project
    const created = await db
      .insert(projectsTable)
      .values({
        name: 'Test Project',
        ownerId: userId as string,
      })
      .returning();

    const project = created[0];

    // Create some test suggestions
    await db.insert(suggestionsTable).values([
      {
        projectId: project.id,
        type: 'layout',
        content: { suggestion: 'Add more spacing between elements' },
      },
      {
        projectId: project.id,
        type: 'style',
        content: { suggestion: 'Use a more vibrant color scheme' },
      },
    ]);

    reply.send({ message: 'Dummy data seeded successfully', project });
  } catch (error) {
    console.error('Error seeding dummy data:', error);
    reply.status(500).send({ error: 'Failed to seed dummy data' });
  }
}

export async function handleGenerateProject(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { projectName } = request.body as any;
    const userId = request.userId;
    if (!userId) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }
    if (!projectName) {
      reply.status(400).send({ error: 'Project name is required.' });
      return;
    }
    const created = await db
      .insert(projectsTable)
      .values({ name: projectName as string, ownerId: userId as string })
      .returning();
    reply.send({
      ok: true,
      message: 'Project created.',
      projectId: created[0].id,
      generatedStructure: null,
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

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      reply.status(400).send({ error: 'Message is required' });
      return;
    }

    // Convert chat message to a coarse ProjectRequest
    const req: ProjectRequest = buildProjectRequestFromMessage(message);

    const agent = new MasterDeveloperAgent();
    const start = Date.now();
    const plan = await agent.execute(req, context || {});
    const totalExecutionTime = Date.now() - start;

    const agents = [
      {
        success: true,
        message: '프로젝트 요구사항 분석 및 아키텍처 설계를 완료했습니다.',
        agentName: 'Project Architect Agent',
        status: 'completed' as const,
        data: plan.architecture,
      },
      {
        success: true,
        message: 'UI/UX 인터페이스 설계를 완료했습니다.',
        agentName: 'UI/UX Designer Agent',
        status: 'completed' as const,
        data: plan.uiDesign,
      },
      {
        success: true,
        message: '프로젝트 코드 구조 생성을 완료했습니다.',
        agentName: 'Code Generator Agent',
        status: 'completed' as const,
        data: plan.codeStructure,
      },
      {
        success: true,
        message: '개발 가이드 작성을 완료했습니다.',
        agentName: 'Development Guide Agent',
        status: 'completed' as const,
        data: plan.developmentGuide,
      },
    ];

    reply.send({
      success: true,
      agents,
      totalExecutionTime,
      summary: 'Master Developer 프로세스가 성공적으로 완료되었습니다.',
    });
  } catch (error) {
    console.error('Error handling multi-agent chat:', error);
    reply.status(500).send({
      success: false,
      agents: [
        {
          success: false,
          message: '처리 중 오류가 발생했습니다.',
          agentName: 'Master Developer',
          status: 'error',
        },
      ],
      totalExecutionTime: 0,
      summary: '프로세스 처리 실패',
    });
  }
}

function buildProjectRequestFromMessage(message: string): ProjectRequest {
  const lower = message.toLowerCase();
  let type: ProjectRequest['type'] = 'web';
  if (lower.includes('mobile') || lower.includes('앱')) type = 'mobile';
  if (lower.includes('api')) type = 'api';
  if (lower.includes('fullstack') || lower.includes('풀스택')) type = 'fullstack';

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

function deriveProjectName(message: string): string {
  const words = message
    .replace(/[\n\r]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .slice(0, 4)
    .map((w) => w.replace(/[^\p{L}\p{N}_-]/gu, ''));
  const base = words.join('-') || 'my-project';
  return base.length > 48 ? base.slice(0, 48) : base;
}

// End of helpers

import { VirtualPreviewGeneratorAgent } from '../agents/virtualPreviewGeneratorAgent.js';

// ... (keep all existing code)

export async function handleVirtualPreview(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { draftId, '*': filePath } = request.params as { draftId: string; '*': string };

    if (!draftId || !filePath) {
      reply.status(400).send({ error: 'draftId and filePath are required.' });
      return;
    }

    const previewAgent = new VirtualPreviewGeneratorAgent();
    const htmlContent = await previewAgent.execute({
      type: 'generate_preview',
      draftId,
      filePath: `/${filePath}`,
    });

    reply.type('text/html').send(htmlContent);
  } catch (error) {
    console.error('Error generating virtual preview:', error);
    reply.status(500).send({ error: 'Failed to generate virtual preview' });
  }
}

