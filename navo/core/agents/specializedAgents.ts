/*
 * Specialized Agents
 * 각 의도별로 특화된 에이전트들
 */

import { Agent, AgentResult } from './types.js';
import { IntentAnalysis } from '../types/intent.js';
import { UserContext } from '../contextManager.js';
import { db } from '../../db/db.js';
import { projects, pages, components, componentDefinitions } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import {
    PROJECT_CREATION_PROMPT,
    buildComponentModificationPrompt,
    buildPageModificationPrompt,
    CODE_REVIEW_PROMPT,
    BUG_FIX_PROMPT,
    FEATURE_REQUEST_PROMPT,
    GENERAL_CONVERSATION_PROMPT,
    QUESTION_ANSWER_PROMPT
} from './prompts.js';

/**
 * 프로젝트 생성 에이전트
 */
export class ProjectCreationAgent implements Agent {
    name = 'ProjectCreationAgent';
    description = '새 프로젝트 생성';

    constructor(private model: any) { }

    canHandle(intent: string): boolean {
        return intent === 'project_creation';
    }

    async execute(
        message: string,
        intentAnalysis: IntentAnalysis,
        userContext: UserContext,
        sessionId: string
    ): Promise<AgentResult> {
        console.log('🏗️ ProjectCreationAgent 시작:', { message, sessionId });

        const result = await this.model.generateContent(`${PROJECT_CREATION_PROMPT}\n\n사용자 요청: ${message}`);
        const response = result.response.text();

        console.log('📝 AI 원본 응답:', response.substring(0, 200) + '...');

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

        console.log('🔧 추출된 JSON:', jsonResponse);

        try {
            const projectData = JSON.parse(jsonResponse);

            // DB에 프로젝트 저장
            const [project] = await db.insert(projects).values({
                name: projectData.name,
                description: projectData.description,
                ownerId: userContext.userId,
                requirements: JSON.stringify({
                    type: projectData.type || 'web',
                    features: projectData.features || [],
                    technology: projectData.technology,
                    complexity: projectData.complexity || 'medium'
                })
            }).returning();

            // 기본 페이지 생성
            const [homePage] = await db.insert(pages).values({
                name: '홈',
                path: '/',
                projectId: project.id,
                layoutJson: {
                    components: [
                        {
                            id: 'header',
                            type: 'Header',
                            props: {
                                title: projectData.name,
                                subtitle: projectData.description
                            }
                        },
                        {
                            id: 'hero',
                            type: 'Hero',
                            props: {
                                title: '안녕하세요!',
                                subtitle: '포트폴리오에 오신 것을 환영합니다',
                                buttonText: '프로젝트 보기',
                                buttonLink: '/projects'
                            }
                        },
                        {
                            id: 'about',
                            type: 'About',
                            props: {
                                title: '소개',
                                content: '여기에 자기소개를 작성하세요.'
                            }
                        },
                        {
                            id: 'projects',
                            type: 'ProjectGrid',
                            props: {
                                title: '프로젝트',
                                projects: []
                            }
                        },
                        {
                            id: 'contact',
                            type: 'Contact',
                            props: {
                                title: '연락처',
                                email: 'your.email@example.com',
                                phone: '010-1234-5678'
                            }
                        }
                    ]
                }
            }).returning();

            // 기본 컴포넌트 정의들 생성
            const [headerDef] = await db.insert(componentDefinitions).values({
                name: 'Header',
                displayName: '헤더',
                description: '사이트 상단 네비게이션',
                category: 'navigation',
                propsSchema: {
                    title: { type: 'string', default: '사이트 제목' },
                    subtitle: { type: 'string', default: '부제목' }
                },
                renderTemplate: `
                    <header class="bg-white shadow-sm">
                        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div class="flex justify-between items-center py-6">
                                <div>
                                    <h1 class="text-2xl font-bold text-gray-900">{{title}}</h1>
                                    <p class="text-gray-600">{{subtitle}}</p>
                                </div>
                                <nav class="space-x-8">
                                    <a href="/" class="text-gray-900 hover:text-gray-600">홈</a>
                                    <a href="/about" class="text-gray-900 hover:text-gray-600">소개</a>
                                    <a href="/projects" class="text-gray-900 hover:text-gray-600">프로젝트</a>
                                    <a href="/contact" class="text-gray-900 hover:text-gray-600">연락처</a>
                                </nav>
                            </div>
                        </div>
                    </header>
                `,
                cssStyles: `
                    header {
                        position: sticky;
                        top: 0;
                        z-index: 50;
                    }
                `,
                projectId: project.id,
                isActive: true
            }).returning();

            const [heroDef] = await db.insert(componentDefinitions).values({
                name: 'Hero',
                displayName: '히어로 섹션',
                description: '메인 배너 섹션',
                category: 'content',
                propsSchema: {
                    title: { type: 'string', default: '환영합니다' },
                    subtitle: { type: 'string', default: '멋진 프로젝트를 확인해보세요' },
                    buttonText: { type: 'string', default: '시작하기' },
                    buttonLink: { type: 'string', default: '/projects' }
                },
                renderTemplate: `
                    <section class="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
                        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                            <h1 class="text-5xl font-bold mb-6">{{title}}</h1>
                            <p class="text-xl mb-8">{{subtitle}}</p>
                            <a href="{{buttonLink}}" class="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                                {{buttonText}}
                            </a>
                        </div>
                    </section>
                `,
                projectId: project.id,
                isActive: true
            }).returning();

            // 페이지에 컴포넌트들 추가
            await db.insert(components).values([
                {
                    pageId: homePage.id,
                    componentDefinitionId: headerDef.id,
                    props: {
                        title: projectData.name,
                        subtitle: projectData.description
                    },
                    orderIndex: 0
                },
                {
                    pageId: homePage.id,
                    componentDefinitionId: heroDef.id,
                    props: {
                        title: '안녕하세요!',
                        subtitle: '포트폴리오에 오신 것을 환영합니다',
                        buttonText: '프로젝트 보기',
                        buttonLink: '/projects'
                    },
                    orderIndex: 1
                }
            ]);

            return {
                success: true,
                message: `🎉 **"${projectData.name}" 포트폴리오 사이트가 완성되었습니다!**\n\n📋 **생성된 내용:**\n• 프로젝트: ${projectData.name}\n• 홈페이지: 기본 레이아웃 구성\n• 컴포넌트: 헤더, 히어로 섹션 등\n• 기능: ${projectData.features.join(', ')}\n\n✨ **다음 단계:**\n1. 프로젝트 목록에서 확인\n2. 페이지 편집으로 내용 수정\n3. 추가 컴포넌트 생성\n\n🚀 **바로 확인해보세요!**`,
                data: { project, homePage },
                type: 'project_creation'
            };
        } catch (error) {
            return {
                success: false,
                message: '프로젝트 생성 중 오류가 발생했습니다.',
                type: 'text'
            };
        }
    }
}

/**
 * 컴포넌트 수정 에이전트
 */
export class ComponentModificationAgent implements Agent {
    name = 'ComponentModificationAgent';
    description = '컴포넌트 수정';

    constructor(private model: any) { }

    canHandle(intent: string): boolean {
        return intent === 'component_modification';
    }

    async execute(
        message: string,
        intentAnalysis: IntentAnalysis,
        userContext: UserContext,
        sessionId: string
    ): Promise<AgentResult> {
        if (!userContext.currentProject) {
            return {
                success: false,
                message: '현재 활성화된 프로젝트가 없습니다. 먼저 프로젝트를 선택해주세요.',
                type: 'text'
            };
        }

        const prompt = buildComponentModificationPrompt(
            userContext.currentComponent?.displayName,
            userContext.currentProject?.name
        );
        const result = await this.model.generateContent(`${prompt}\n\n사용자 요청: ${message}`);
        const response = result.response.text();

        try {
            const modificationData = JSON.parse(response);

            // 컴포넌트 업데이트
            if (userContext.currentComponent) {
                await db.update(components)
                    .set({
                        props: modificationData.code,
                        updatedAt: new Date().toISOString()
                    })
                    .where(eq(components.id, userContext.currentComponent.id));
            }

            return {
                success: true,
                message: `컴포넌트 "${modificationData.componentName}"이 성공적으로 수정되었습니다! ✨\n\n변경사항:\n${Object.entries(modificationData.modifications).map(([key, value]) => `- ${key}: ${value}`).join('\n')}`,
                data: modificationData,
                type: 'component'
            };
        } catch (error) {
            return {
                success: false,
                message: '컴포넌트 수정 중 오류가 발생했습니다.',
                type: 'text'
            };
        }
    }
}

/**
 * 페이지 수정 에이전트
 */
export class PageModificationAgent implements Agent {
    name = 'PageModificationAgent';
    description = '페이지 수정';

    constructor(private model: any) { }

    canHandle(intent: string): boolean {
        return intent === 'page_modification';
    }

    async execute(
        message: string,
        intentAnalysis: IntentAnalysis,
        userContext: UserContext,
        sessionId: string
    ): Promise<AgentResult> {
        if (!userContext.currentProject) {
            return {
                success: false,
                message: '현재 활성화된 프로젝트가 없습니다. 먼저 프로젝트를 선택해주세요.',
                type: 'text'
            };
        }

        const prompt = buildPageModificationPrompt(userContext.currentProject?.name);
        const result = await this.model.generateContent(`${prompt}\n\n사용자 요청: ${message}`);
        const response = result.response.text();

        try {
            const modificationData = JSON.parse(response);

            return {
                success: true,
                message: `페이지 "${modificationData.pageName}"이 성공적으로 수정되었습니다! 📄\n\n변경사항:\n${Object.entries(modificationData.modifications).map(([key, value]) => `- ${key}: ${value}`).join('\n')}`,
                data: modificationData,
                type: 'page'
            };
        } catch (error) {
            return {
                success: false,
                message: '페이지 수정 중 오류가 발생했습니다.',
                type: 'text'
            };
        }
    }
}

/**
 * 코드 리뷰 에이전트
 */
export class CodeReviewAgent implements Agent {
    name = 'CodeReviewAgent';
    description = '코드 리뷰';

    constructor(private model: any) { }

    canHandle(intent: string): boolean {
        return intent === 'code_review';
    }

    async execute(
        message: string,
        intentAnalysis: IntentAnalysis,
        userContext: UserContext,
        sessionId: string
    ): Promise<AgentResult> {
        const result = await this.model.generateContent(`${CODE_REVIEW_PROMPT}\n\n코드 리뷰 요청: ${message}`);
        const response = result.response.text();

        try {
            const reviewData = JSON.parse(response);

            return {
                success: true,
                message: `코드 리뷰 완료! 📊\n\n점수: ${reviewData.score}/10\n\n발견된 문제점:\n${reviewData.issues.map((issue: string) => `- ${issue}`).join('\n')}\n\n개선 제안:\n${reviewData.suggestions.map((suggestion: string) => `- ${suggestion}`).join('\n')}`,
                data: reviewData,
                type: 'code'
            };
        } catch (error) {
            return {
                success: false,
                message: '코드 리뷰 중 오류가 발생했습니다.',
                type: 'text'
            };
        }
    }
}

/**
 * 버그 수정 에이전트
 */
export class BugFixAgent implements Agent {
    name = 'BugFixAgent';
    description = '버그 수정';

    constructor(private model: any) { }

    canHandle(intent: string): boolean {
        return intent === 'bug_fix';
    }

    async execute(
        message: string,
        intentAnalysis: IntentAnalysis,
        userContext: UserContext,
        sessionId: string
    ): Promise<AgentResult> {
        const result = await this.model.generateContent(`${BUG_FIX_PROMPT}\n\n버그 리포트: ${message}`);
        const response = result.response.text();

        try {
            const fixData = JSON.parse(response);

            return {
                success: true,
                message: `버그 수정 완료! 🐛✨\n\n버그: ${fixData.bugDescription}\n근본 원인: ${fixData.rootCause}\n해결 방안: ${fixData.solution}\n\n재발 방지: ${fixData.prevention}`,
                data: fixData,
                type: 'code'
            };
        } catch (error) {
            return {
                success: false,
                message: '버그 수정 중 오류가 발생했습니다.',
                type: 'text'
            };
        }
    }
}

/**
 * 기능 요청 에이전트
 */
export class FeatureRequestAgent implements Agent {
    name = 'FeatureRequestAgent';
    description = '기능 요청';

    constructor(private model: any) { }

    canHandle(intent: string): boolean {
        return intent === 'feature_request';
    }

    async execute(
        message: string,
        intentAnalysis: IntentAnalysis,
        userContext: UserContext,
        sessionId: string
    ): Promise<AgentResult> {
        const result = await this.model.generateContent(`${FEATURE_REQUEST_PROMPT}\n\n기능 요청: ${message}`);
        const response = result.response.text();

        try {
            const featureData = JSON.parse(response);

            return {
                success: true,
                message: `기능 요청 분석 완료! 🚀\n\n기능: ${featureData.featureName}\n설명: ${featureData.description}\n우선순위: ${featureData.priority}\n구현 방안: ${featureData.implementation}\n예상 시간: ${featureData.estimatedTime}`,
                data: featureData,
                type: 'text'
            };
        } catch (error) {
            return {
                success: false,
                message: '기능 요청 분석 중 오류가 발생했습니다.',
                type: 'text'
            };
        }
    }
}

/**
 * 일반 대화 에이전트
 */
export class GeneralConversationAgent implements Agent {
    name = 'GeneralConversationAgent';
    description = '일반 대화';

    constructor(private model: any) { }

    canHandle(intent: string): boolean {
        return intent === 'general';
    }

    async execute(
        message: string,
        intentAnalysis: IntentAnalysis,
        userContext: UserContext,
        sessionId: string
    ): Promise<AgentResult> {
        const result = await this.model.generateContent(`${GENERAL_CONVERSATION_PROMPT}\n\n사용자: ${message}`);
        const response = result.response.text();

        return {
            success: true,
            message: response,
            type: 'text'
        };
    }
}

/**
 * 질문 답변 에이전트
 */
export class QuestionAnswerAgent implements Agent {
    name = 'QuestionAnswerAgent';
    description = '질문 답변';

    constructor(private model: any) { }

    canHandle(intent: string): boolean {
        return intent === 'question';
    }

    async execute(
        message: string,
        intentAnalysis: IntentAnalysis,
        userContext: UserContext,
        sessionId: string
    ): Promise<AgentResult> {
        const result = await this.model.generateContent(`${QUESTION_ANSWER_PROMPT}\n\n질문: ${message}`);
        const response = result.response.text();

        return {
            success: true,
            message: response,
            type: 'text'
        };
    }
}
