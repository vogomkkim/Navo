/*
 * Intent-Based Agent System
 * 사용자 의도에 따라 적절한 에이전트를 직접 실행하는 시스템
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../logger.js';
import { UserContext, contextManager } from '../contextManager.js';
import { IntentAnalysis } from '../types/intent.js';
import { Agent, AgentResult } from './types.js';
import { INTENT_ANALYSIS_SYSTEM_PROMPT, buildIntentAnalysisUserPrompt } from './prompts.js';

/**
 * 의도 기반 에이전트 시스템
 */
export class IntentBasedAgentSystem {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private agents: Map<string, Agent>;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
        });
        this.agents = new Map();
        this.registerDefaultAgents();
    }

    /**
     * 기본 에이전트들 등록
     */
    private registerDefaultAgents(): void {
        // 에이전트들을 동적으로 import하여 등록
        import('./specializedAgents.js').then(({
            ProjectCreationAgent,
            ProjectSetupAgent,
            DevelopmentSetupAgent,
            DeploymentSetupAgent,
            SitePlannerAgent,
            SiteComposerAgent,
            ComponentModificationAgent,
            PageModificationAgent,
            CodeReviewAgent,
            BugFixAgent,
            FeatureRequestAgent,
            GeneralConversationAgent,
            QuestionAnswerAgent
        }) => {
            this.registerAgent(new ProjectCreationAgent(this.model));
            this.registerAgent(new ProjectSetupAgent(this.model));
            this.registerAgent(new DevelopmentSetupAgent(this.model));
            this.registerAgent(new DeploymentSetupAgent(this.model));
            this.registerAgent(new SitePlannerAgent(this.model));
            this.registerAgent(new SiteComposerAgent(this.model));
            this.registerAgent(new ComponentModificationAgent(this.model));
            this.registerAgent(new PageModificationAgent(this.model));
            this.registerAgent(new CodeReviewAgent(this.model));
            this.registerAgent(new BugFixAgent(this.model));
            this.registerAgent(new FeatureRequestAgent(this.model));
            this.registerAgent(new GeneralConversationAgent(this.model));
            this.registerAgent(new QuestionAnswerAgent(this.model));
            logger.info('에이전트 준비 완료');
        });
    }

    /**
     * 에이전트 등록
     */
    registerAgent(agent: Agent): void {
        this.agents.set(agent.name, agent);
    }

    /**
     * 메인 실행 메서드
     */
    async execute(
        message: string,
        userContext: UserContext,
        sessionId: string
    ): Promise<AgentResult> {
        const startTime = Date.now();

        console.log('🤖 IntentBasedAgentSystem 시작:', { message, sessionId });

        try {
            // 1. 의도 분석
            const intentAnalysis = await this.analyzeIntent(message, userContext);
            console.log('📊 의도 분석 결과:', intentAnalysis);

            // 2. 적절한 에이전트 선택
            const selectedAgent = this.selectAgent(intentAnalysis);
            console.log('🎯 선택된 에이전트:', selectedAgent ? selectedAgent.name : '없음');

            if (!selectedAgent) {
                console.log('❌ 적절한 에이전트를 찾을 수 없음');
                return {
                    success: false,
                    message: '죄송합니다. 요청을 처리할 수 있는 적절한 에이전트를 찾을 수 없습니다.',
                    type: 'text'
                };
            }

            // 3. 에이전트 실행
            console.log('🚀 에이전트 실행 시작:', selectedAgent.name);
            const result = await selectedAgent.execute(
                message,
                intentAnalysis,
                userContext,
                sessionId
            );
            console.log('✅ 에이전트 실행 완료:', {
                agent: selectedAgent.name,
                success: result.success,
                type: result.type,
                messageLength: result.message.length
            });

            // 4. 프로젝트 생성 후: 현재 프로젝트 지정, 체인 실행
            if (result.success && result.type === 'project_creation') {
                console.log('🔄 체인 에이전트 실행 시작...');

                // projectId를 컨텍스트에 반영 (UI/후속 단계에서 활용)
                try {
                    const newProjectId = (result.data as any)?.project?.id;
                    if (newProjectId) {
                        await contextManager.setCurrentProject(sessionId, userContext.userId, newProjectId);
                        userContext.currentProject = { id: newProjectId, name: (result.data as any)?.project?.name } as any;
                    }
                } catch (e) {
                    console.warn('컨텍스트 프로젝트 설정 실패:', e);
                }

                const chainResults = await this.executeChainAgents(userContext, sessionId);
                result.data = { ...result.data, chainResults };
                result.message += '\n\n' + chainResults.map(r => r.message).join('\n\n');
            }

            // 5. 메타데이터 추가
            result.metadata = {
                executionTime: Date.now() - startTime,
                tokens: 0, // TODO: 실제 토큰 수 계산
                model: 'gemini-2.5-flash'
            };

            return result;

        } catch (error) {
            console.error('IntentBasedAgentSystem execution failed:', error);
            return {
                success: false,
                message: '죄송합니다. 요청 처리 중 오류가 발생했습니다.',
                type: 'text'
            };
        }
    }

    /**
 * 의도 분석
 */
    private async analyzeIntent(
        message: string,
        userContext: UserContext
    ): Promise<IntentAnalysis> {
        const systemPrompt = INTENT_ANALYSIS_SYSTEM_PROMPT;
        const userPrompt = buildIntentAnalysisUserPrompt(
            message,
            userContext.currentProject?.name,
            userContext.currentComponent?.displayName
        );

        console.log('🔍 의도 분석 시작:', { message, systemPrompt: systemPrompt.substring(0, 100) + '...' });

        const result = await this.model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
        const response = result.response.text();

        // 응답에서 JSON만 추출
        let jsonResponse = response.trim();

        // JSON 코드 블록이 있다면 제거
        if (jsonResponse.startsWith('```json')) {
            jsonResponse = jsonResponse.slice(7);
        }
        if (jsonResponse.startsWith('```')) {
            jsonResponse = jsonResponse.slice(3);
        }
        if (jsonResponse.endsWith('```')) {
            jsonResponse = jsonResponse.slice(0, -3);
        }

        // 첫 번째 {와 마지막 } 사이만 추출
        const start = jsonResponse.indexOf('{');
        const end = jsonResponse.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            jsonResponse = jsonResponse.slice(start, end + 1);
        }

        try {
            const parsed = JSON.parse(jsonResponse);
            console.log('✅ 의도 분석 JSON 파싱 성공:', parsed);
            return {
                type: parsed.type,
                confidence: parsed.confidence || 0.8,
                description: parsed.description || '의도 분석 완료',
                isVague: parsed.isVague || false,
                targets: parsed.targets || [],
                actions: parsed.actions || [],
                status: 'auto_execute'
            };
        } catch (error) {
            console.log('❌ 의도 분석 JSON 파싱 실패:', error);
            console.log('📝 AI 원본 응답:', response);
            return {
                type: 'general',
                confidence: 0.5,
                description: '의도 분석 실패',
                isVague: true,
                status: 'manual'
            };
        }
    }

    /**
     * 체인 에이전트 실행 (프로젝트 생성 후 자동 실행)
     */
    private async executeChainAgents(userContext: UserContext, sessionId: string): Promise<AgentResult[]> {
        const chainAgents = [
            { intent: 'project_setup', name: 'ProjectSetupAgent' },
            { intent: 'site_planning', name: 'SitePlannerAgent' },
            { intent: 'site_composition', name: 'SiteComposerAgent' },
            { intent: 'development_setup', name: 'DevelopmentSetupAgent' },
            { intent: 'deployment_setup', name: 'DeploymentSetupAgent' }
        ];

        const results: AgentResult[] = [];

        for (const chainAgent of chainAgents) {
            try {
                // minimized: run chain agent silently; rely on result statuses

                const agent = this.agents.get(chainAgent.name);
                if (agent) {
                    const intentAnalysis: IntentAnalysis = {
                        type: chainAgent.intent as any,
                        confidence: 1.0,
                        description: `체인 실행: ${chainAgent.name}`,
                        isVague: false,
                        targets: [],
                        actions: [],
                        status: 'auto_execute'
                    };

                    // SitePlanner 결과를 SiteComposer로 전달하기 위해 메시지에 JSON 포함
                    let message = `체인 실행: ${chainAgent.name}`;
                    if (chainAgent.intent === 'site_composition') {
                        // 이전 결과 중 site_plan을 찾아 포함
                        const plan = results.find(r => r.type === 'site_plan')?.data?.taskPlan;
                        if (plan) {
                            message += `\n${JSON.stringify(plan)}`;
                        }
                    }

                    const result = await agent.execute(
                        message,
                        intentAnalysis,
                        userContext,
                        sessionId
                    );

                    results.push(result);
                    // minimized: completion logged only via result aggregation if needed
                }
            } catch (error) {
                console.error(`❌ 체인 에이전트 실패: ${chainAgent.name}`, error);
                results.push({
                    success: false,
                    message: `${chainAgent.name} 실행 중 오류가 발생했습니다.`,
                    type: 'text'
                });
            }
        }

        return results;
    }

    /**
     * 적절한 에이전트 선택
     */
    private selectAgent(intentAnalysis: IntentAnalysis): Agent | null {
        // minimized: selection logging suppressed
        // console.log('📋 사용 가능한 에이전트들:', Array.from(this.agents.keys()));

        for (const agent of this.agents.values()) {
            // minimized: per-agent canHandle logs suppressed
            if (agent.canHandle(intentAnalysis.type)) {
                // minimized: selection detail suppressed
                return agent;
            }
        }

        // minimized: no matching agent log suppressed
        return null;
    }
}

// 싱글톤 인스턴스
export const intentBasedAgentSystem = new IntentBasedAgentSystem(
    process.env.GEMINI_API_KEY || ''
);
