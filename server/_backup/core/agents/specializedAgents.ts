/*
 * Specialized Agents
 * 각 의도별로 특화된 에이전트들
 */

import { Agent, AgentResult } from './types.js';
import { IntentAnalysis } from '../types/intent.js';
import { UserContext } from '../contextManager.js';
import { db } from '../../db/db.js';
import {
  projects,
  pages,
  components,
  componentDefinitions,
} from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  PROJECT_CREATION_PROMPT,
  SITE_PLANNER_PROMPT,
  buildComponentModificationPrompt,
  buildPageModificationPrompt,
  CODE_REVIEW_PROMPT,
  BUG_FIX_PROMPT,
  FEATURE_REQUEST_PROMPT,
  GENERAL_CONVERSATION_PROMPT,
  QUESTION_ANSWER_PROMPT,
} from './prompts.js';

/**
 * 프로젝트 생성 에이전트
 */
export class ProjectCreationAgent implements Agent {
  name = 'ProjectCreationAgent';
  description = '새 프로젝트 생성';

  constructor(private model: any) {}

  canHandle(intent: string): boolean {
    return intent === 'project_creation';
  }

  async execute(
    message: string,
    intentAnalysis: IntentAnalysis,
    userContext: UserContext,
    sessionId: string
  ): Promise<AgentResult> {
    // minimized: agent start logs suppressed

    const result = await this.model.generateContent(
      `${PROJECT_CREATION_PROMPT}\n\n사용자 요청: ${message}`
    );
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
      const projectData = JSON.parse(jsonResponse);
      console.log('✅ ProjectCreationAgent JSON 파싱 성공:', projectData);

      // DB에 프로젝트 저장
      const [project] = await db
        .insert(projects)
        .values({
          name: projectData.name,
          description: projectData.description,
          ownerId: userContext.userId,
          requirements: JSON.stringify({
            type: projectData.type || 'web',
            features: projectData.features || [],
            technology: projectData.technology,
            complexity: projectData.complexity || 'medium',
          }),
        })
        .returning();

      // 프로젝트 타입과 기능에 따른 동적 페이지 생성
      const pagesToCreate: Array<{
        name: string;
        path: string;
        layoutJson: {
          components: Array<{
            id: string;
            type: string;
            props: any;
          }>;
        };
      }> = [];

      // 기본 홈페이지
      pagesToCreate.push({
        name: '홈',
        path: '/',
        layoutJson: {
          components: [
            {
              id: 'header',
              type: 'Header',
              props: {
                title: projectData.name,
                subtitle: projectData.description,
              },
            },
            {
              id: 'hero',
              type: 'Hero',
              props: {
                title: '환영합니다!',
                subtitle: projectData.description,
                buttonText: '시작하기',
                buttonLink: '/about',
              },
            },
          ],
        },
      });

      // 기능별 페이지 생성
      if (
        projectData.features.includes('자기소개') ||
        projectData.features.includes('소개')
      ) {
        pagesToCreate.push({
          name: '소개',
          path: '/about',
          layoutJson: {
            components: [
              {
                id: 'about-section',
                type: 'About',
                props: {
                  title: '자기소개',
                  content: '여기에 자기소개를 작성하세요.',
                  skills: ['React', 'JavaScript', 'TypeScript'],
                  experience: '3년차 개발자',
                },
              },
            ],
          },
        });
      }

      if (
        projectData.features.includes('프로젝트 갤러리') ||
        projectData.features.includes('프로젝트')
      ) {
        pagesToCreate.push({
          name: '프로젝트',
          path: '/projects',
          layoutJson: {
            components: [
              {
                id: 'projects-grid',
                type: 'ProjectGrid',
                props: {
                  title: '프로젝트',
                  projects: [
                    {
                      id: 1,
                      title: '샘플 프로젝트 1',
                      description: '프로젝트 설명',
                      image: '/sample1.jpg',
                      technologies: ['React', 'Node.js'],
                    },
                  ],
                },
              },
            ],
          },
        });
      }

      if (
        projectData.features.includes('연락처') ||
        projectData.features.includes('contact')
      ) {
        pagesToCreate.push({
          name: '연락처',
          path: '/contact',
          layoutJson: {
            components: [
              {
                id: 'contact-form',
                type: 'Contact',
                props: {
                  title: '연락처',
                  email: 'your.email@example.com',
                  phone: '010-1234-5678',
                  address: '서울시 강남구',
                },
              },
            ],
          },
        });
      }

      // 페이지들을 DB에 생성
      const createdPages: any[] = [];
      for (const pageData of pagesToCreate) {
        const [page] = await db
          .insert(pages)
          .values({
            name: pageData.name,
            path: pageData.path,
            projectId: project.id,
            layoutJson: pageData.layoutJson,
          })
          .returning();
        createdPages.push(page);
      }

      const homePage = createdPages[0]; // 첫 번째 페이지가 홈페이지

      // 프로젝트에 필요한 컴포넌트 정의들 생성
      const componentDefinitionsToCreate = [
        {
          name: 'Header',
          displayName: '헤더',
          description: '사이트 상단 네비게이션',
          category: 'navigation',
          propsSchema: {
            title: { type: 'string', default: '사이트 제목' },
            subtitle: { type: 'string', default: '부제목' },
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
        },
        {
          name: 'Hero',
          displayName: '히어로 섹션',
          description: '메인 배너 섹션',
          category: 'content',
          propsSchema: {
            title: { type: 'string', default: '환영합니다' },
            subtitle: {
              type: 'string',
              default: '멋진 프로젝트를 확인해보세요',
            },
            buttonText: { type: 'string', default: '시작하기' },
            buttonLink: { type: 'string', default: '/projects' },
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
        },
        {
          name: 'About',
          displayName: '소개 섹션',
          description: '자기소개 섹션',
          category: 'content',
          propsSchema: {
            title: { type: 'string', default: '자기소개' },
            content: { type: 'string', default: '소개 내용' },
            skills: { type: 'array', default: [] },
            experience: { type: 'string', default: '경력' },
          },
          renderTemplate: `
                        <section class="py-16 bg-gray-50">
                            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <h2 class="text-3xl font-bold text-gray-900 mb-8">{{title}}</h2>
                                <div class="grid md:grid-cols-2 gap-8">
                                    <div>
                                        <p class="text-lg text-gray-700 mb-6">{{content}}</p>
                                        <p class="text-gray-600"><strong>경력:</strong> {{experience}}</p>
                                    </div>
                                    <div>
                                        <h3 class="text-xl font-semibold mb-4">기술 스택</h3>
                                        <div class="flex flex-wrap gap-2">
                                            {{#each skills}}
                                            <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">{{this}}</span>
                                            {{/each}}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    `,
        },
        {
          name: 'ProjectGrid',
          displayName: '프로젝트 그리드',
          description: '프로젝트 목록 표시',
          category: 'content',
          propsSchema: {
            title: { type: 'string', default: '프로젝트' },
            projects: { type: 'array', default: [] },
          },
          renderTemplate: `
                        <section class="py-16">
                            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <h2 class="text-3xl font-bold text-gray-900 mb-8">{{title}}</h2>
                                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {{#each projects}}
                                    <div class="bg-white rounded-lg shadow-md overflow-hidden">
                                        <img src="{{image}}" alt="{{title}}" class="w-full h-48 object-cover">
                                        <div class="p-6">
                                            <h3 class="text-xl font-semibold mb-2">{{title}}</h3>
                                            <p class="text-gray-600 mb-4">{{description}}</p>
                                            <div class="flex flex-wrap gap-2">
                                                {{#each technologies}}
                                                <span class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">{{this}}</span>
                                                {{/each}}
                                            </div>
                                        </div>
                                    </div>
                                    {{/each}}
                                </div>
                            </div>
                        </section>
                    `,
        },
        {
          name: 'Contact',
          displayName: '연락처 폼',
          description: '연락처 정보 및 폼',
          category: 'content',
          propsSchema: {
            title: { type: 'string', default: '연락처' },
            email: { type: 'string', default: 'email@example.com' },
            phone: { type: 'string', default: '010-1234-5678' },
            address: { type: 'string', default: '주소' },
          },
          renderTemplate: `
                        <section class="py-16 bg-gray-50">
                            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <h2 class="text-3xl font-bold text-gray-900 mb-8">{{title}}</h2>
                                <div class="grid md:grid-cols-2 gap-8">
                                    <div>
                                        <h3 class="text-xl font-semibold mb-4">연락처 정보</h3>
                                        <div class="space-y-3">
                                            <p><strong>이메일:</strong> <a href="mailto:{{email}}" class="text-blue-600 hover:underline">{{email}}</a></p>
                                            <p><strong>전화:</strong> <a href="tel:{{phone}}" class="text-blue-600 hover:underline">{{phone}}</a></p>
                                            <p><strong>주소:</strong> {{address}}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 class="text-xl font-semibold mb-4">메시지 보내기</h3>
                                        <form class="space-y-4">
                                            <input type="text" placeholder="이름" class="w-full px-4 py-2 border rounded-lg">
                                            <input type="email" placeholder="이메일" class="w-full px-4 py-2 border rounded-lg">
                                            <textarea placeholder="메시지" rows="4" class="w-full px-4 py-2 border rounded-lg"></textarea>
                                            <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">보내기</button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </section>
                    `,
        },
      ];

      // 컴포넌트 정의들을 DB에 생성
      const createdComponentDefs: any[] = [];
      for (const compDef of componentDefinitionsToCreate) {
        const [def] = await db
          .insert(componentDefinitions)
          .values({
            ...compDef,
            projectId: project.id,
            isActive: true,
          })
          .returning();
        createdComponentDefs.push(def);
      }

      const headerDef = createdComponentDefs[0];
      const heroDef = createdComponentDefs[1];

      // 페이지에 컴포넌트들 추가
      await db.insert(components).values([
        {
          pageId: homePage.id,
          componentDefinitionId: headerDef.id,
          props: {
            title: projectData.name,
            subtitle: projectData.description,
          },
          orderIndex: 0,
        },
        {
          pageId: homePage.id,
          componentDefinitionId: heroDef.id,
          props: {
            title: '안녕하세요!',
            subtitle: '포트폴리오에 오신 것을 환영합니다',
            buttonText: '프로젝트 보기',
            buttonLink: '/projects',
          },
          orderIndex: 1,
        },
      ]);

      // 기술 스택에 따른 추가 정보 생성
      const techInfo = projectData.technology.includes('React Native')
        ? `📱 **모바일 앱 프로젝트**\n• React Native로 크로스 플랫폼 앱 개발\n• Supabase 연동으로 백엔드 서비스 제공\n• Expo 또는 React Native CLI 사용 가능`
        : `🌐 **웹 프로젝트**\n• React + Tailwind CSS로 모던 웹 개발\n• Supabase 연동으로 백엔드 서비스 제공\n• 반응형 디자인 지원`;

      const setupInfo = `🔧 **설정 필요사항:**\n• Supabase 계정 생성 및 프로젝트 설정\n• 환경 변수 설정 (API 키, URL)\n• 데이터베이스 스키마 구성`;

      return {
        success: true,
        message: `🎉 **"${projectData.name}" 프로젝트가 완성되었습니다!**\n\n📋 **생성된 내용:**\n• 프로젝트: ${projectData.name}\n• 타입: ${projectData.type}\n• 기술 스택: ${projectData.technology}\n• 기능: ${projectData.features.join(', ')}\n• 복잡도: ${projectData.complexity}\n\n${techInfo}\n\n${setupInfo}\n\n✨ **다음 단계:**\n1. 프로젝트 목록에서 확인\n2. Supabase 설정 완료\n3. 개발 환경 구성\n4. 기능 구현 시작\n\n🚀 **바로 확인해보세요!**`,
        data: { project, homePage },
        type: 'project_creation',
      };
    } catch (error) {
      console.log('❌ ProjectCreationAgent JSON 파싱 실패:', error);
      console.log('📝 AI 원본 응답:', response);
      return {
        success: false,
        message: '프로젝트 생성 중 오류가 발생했습니다.',
        type: 'text',
      };
    }
  }
}

/**
 * 프로젝트 설정 에이전트
 */
export class ProjectSetupAgent implements Agent {
  name = 'ProjectSetupAgent';
  description = '프로젝트 설정 및 환경 구성';

  constructor(private model: any) {}

  canHandle(intent: string): boolean {
    const canHandle = intent === 'project_setup';
    console.log(`🔧 ProjectSetupAgent.canHandle("${intent}"): ${canHandle}`);
    return canHandle;
  }

  async execute(
    message: string,
    intentAnalysis: IntentAnalysis,
    userContext: UserContext,
    sessionId: string
  ): Promise<AgentResult> {
    console.log('🔧 ProjectSetupAgent 시작:', { message, sessionId });

    // 프로젝트 설정 정보 생성
    const setupInfo = {
      supabase: {
        projectName: `navo-${Date.now()}`,
        region: 'ap-northeast-1',
        database: 'postgres',
        auth: true,
        storage: true,
        realtime: true,
      },
      environment: {
        nodeVersion: '18.x',
        packageManager: 'npm',
        framework: 'React',
        styling: 'Tailwind CSS',
      },
      deployment: {
        platform: 'Vercel',
        domain: 'auto-generated',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
      },
    };

    return {
      success: true,
      message: `🔧 **프로젝트 설정이 완료되었습니다!**\n\n📋 **설정 내용:**\n• Supabase 프로젝트: ${setupInfo.supabase.projectName}\n• 지역: ${setupInfo.supabase.region}\n• 배포 플랫폼: ${setupInfo.deployment.platform}\n• Node.js 버전: ${setupInfo.environment.nodeVersion}\n\n✨ **다음 단계:**\n1. Supabase 대시보드에서 프로젝트 생성\n2. 환경 변수 설정\n3. 개발 환경 구성\n\n🚀 **바로 시작하세요!**`,
      data: setupInfo,
      type: 'project_setup',
    };
  }
}

/**
 * 개발 환경 구성 에이전트
 */
export class DevelopmentSetupAgent implements Agent {
  name = 'DevelopmentSetupAgent';
  description = '개발 환경 구성 및 파일 생성';

  constructor(private model: any) {}

  canHandle(intent: string): boolean {
    const canHandle = intent === 'development_setup';
    console.log(
      `💻 DevelopmentSetupAgent.canHandle("${intent}"): ${canHandle}`
    );
    return canHandle;
  }

  async execute(
    message: string,
    intentAnalysis: IntentAnalysis,
    userContext: UserContext,
    sessionId: string
  ): Promise<AgentResult> {
    console.log('💻 DevelopmentSetupAgent 시작:', { message, sessionId });

    // 개발 환경 파일들 생성
    const devFiles = {
      packageJson: {
        name: 'navo-project',
        version: '1.0.0',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          '@supabase/supabase-js': '^2.38.0',
        },
        devDependencies: {
          '@vitejs/plugin-react': '^4.0.0',
          vite: '^4.4.0',
          tailwindcss: '^3.3.0',
          autoprefixer: '^10.4.0',
        },
      },
      viteConfig: {
        plugins: ['@vitejs/plugin-react()'],
        build: {
          outDir: 'dist',
        },
      },
      tailwindConfig: {
        content: ['./src/**/*.{js,ts,jsx,tsx}'],
        theme: {
          extend: {},
        },
        plugins: [],
      },
      envExample: {
        VITE_SUPABASE_URL: 'your-supabase-url',
        VITE_SUPABASE_ANON_KEY: 'your-supabase-anon-key',
      },
    };

    return {
      success: true,
      message: `💻 **개발 환경 구성이 완료되었습니다!**\n\n📁 **생성된 파일들:**\n• package.json - 프로젝트 의존성\n• vite.config.js - 빌드 설정\n• tailwind.config.js - 스타일 설정\n• .env.example - 환경 변수 템플릿\n\n🔧 **설치 명령어:**\n\`\`\`bash\nnpm install\n\`\`\`\n\n🚀 **개발 서버 시작:**\n\`\`\`bash\nnpm run dev\n\`\`\`\n\n✨ **다음 단계:**\n1. 의존성 설치\n2. 환경 변수 설정\n3. 개발 시작\n\n🎉 **거의 완료되었습니다!**`,
      data: devFiles,
      type: 'development_setup',
    };
  }
}

/**
 * 사이트 플래너 에이전트 - 아웃라인을 TaskPlan(JSON)으로 변환
 */
export class SitePlannerAgent implements Agent {
  name = 'SitePlannerAgent';
  description = '아웃라인을 기반으로 페이지/섹션 설계를 생성';

  constructor(private model: any) {}

  canHandle(intent: string): boolean {
    return intent === 'site_planning';
  }

  async execute(
    message: string,
    intentAnalysis: IntentAnalysis,
    userContext: UserContext,
    sessionId: string
  ): Promise<AgentResult> {
    const start = Date.now();
    const prompt = `${SITE_PLANNER_PROMPT}\n\n프로젝트 설명 또는 요청: ${message}`;
    const result = await this.model.generateContent(prompt);
    const response = result.response.text();

    // 코드블록 제거 및 JSON 추출
    let json = response.trim();
    if (json.startsWith('```json')) json = json.slice(7);
    if (json.startsWith('```')) json = json.slice(3);
    if (json.endsWith('```')) json = json.slice(0, -3);
    const s = json.indexOf('{');
    const e = json.lastIndexOf('}');
    if (s !== -1 && e !== -1 && e > s) json = json.slice(s, e + 1);

    try {
      const taskPlan = JSON.parse(json);
      return {
        success: true,
        message: '사이트 계획이 생성되었습니다.',
        data: { taskPlan },
        type: 'site_plan',
        metadata: {
          executionTime: Date.now() - start,
          tokens: 0,
          model: 'gemini-2.5-flash',
        },
      };
    } catch (err) {
      return {
        success: false,
        message: '사이트 계획 생성 중 JSON 파싱에 실패했습니다.',
        type: 'text',
      };
    }
  }
}

/**
 * 사이트 컴포저 에이전트 - TaskPlan을 DB(CMS)에 적용
 */
export class SiteComposerAgent implements Agent {
  name = 'SiteComposerAgent';
  description = 'TaskPlan을 바탕으로 페이지/컴포넌트 DB에 기록';

  constructor(private model: any) {}

  canHandle(intent: string): boolean {
    return intent === 'site_composition';
  }

  async execute(
    message: string,
    intentAnalysis: IntentAnalysis,
    userContext: UserContext,
    sessionId: string
  ): Promise<AgentResult> {
    const start = Date.now();
    if (!userContext.currentProject?.id) {
      return {
        success: false,
        message: '현재 프로젝트가 없습니다.',
        type: 'text',
      };
    }

    // message는 로그용, 실제 계획은 intentAnalysis.targets 또는 userContext.contextData에서 받을 수 있음
    // 여기서는 message에 포함된 JSON 혹은 userContext.contextData.taskPlan 우선
    let taskPlan: any = (userContext as any).contextData?.taskPlan;
    if (!taskPlan) {
      try {
        const s = message.indexOf('{');
        const e = message.lastIndexOf('}');
        if (s !== -1 && e !== -1 && e > s) {
          taskPlan = JSON.parse(message.slice(s, e + 1));
        }
      } catch {}
    }

    if (!taskPlan || !Array.isArray(taskPlan.pages)) {
      return {
        success: false,
        message: '유효한 TaskPlan이 없습니다.',
        type: 'text',
      };
    }

    const projectId = userContext.currentProject.id;
    const createdPages: Array<{ id: string; path: string }> = [];

    // 1) 필요한 컴포넌트 정의 idempotent 생성/재사용을 위한 맵
    const neededTypes = new Set<string>();
    for (const p of taskPlan.pages) {
      for (const s of p.sections || []) neededTypes.add(s.type);
    }

    const typeToDefId = new Map<string, string>();

    // 조회 후 없으면 생성
    for (const typeName of neededTypes) {
      const existing = await db.query.componentDefinitions.findFirst({
        where: (cd: typeof componentDefinitions, { and, eq }: any) =>
          and(eq(cd.projectId, projectId), eq(cd.name, typeName)),
      } as any);

      if (existing) {
        typeToDefId.set(typeName, (existing as any).id);
      } else {
        const [def] = await db
          .insert(componentDefinitions)
          .values({
            projectId,
            name: typeName,
            displayName: typeName,
            description: `${typeName} 자동 생성`,
            category: 'content',
            propsSchema: {},
            renderTemplate: '<div>{{content}}</div>',
            cssStyles: '',
          })
          .returning();
        typeToDefId.set(typeName, def.id);
      }
    }

    // 2) 페이지 생성(upsert: path 기준)
    for (const p of taskPlan.pages) {
      const existing = await db.query.pages.findFirst({
        where: (pg: typeof pages, { and, eq }: any) =>
          and(eq(pg.projectId, projectId), eq(pg.path, p.path)),
      } as any);

      let pageId: string;
      if (existing) {
        pageId = (existing as any).id;
      } else {
        const [page] = await db
          .insert(pages)
          .values({
            projectId,
            path: p.path,
            name: p.name || p.path,
            description: p.description || null,
            layoutJson: { components: [] },
          })
          .returning();
        pageId = page.id;
      }

      createdPages.push({ id: pageId, path: p.path });

      // 3) 컴포넌트 배치(기존은 유지, 간단히 append). 향후 idempotent 정교화 가능
      let order = 0;
      for (const s of p.sections || []) {
        const defId = typeToDefId.get(s.type);
        if (!defId) continue;
        await db.insert(components).values({
          pageId,
          componentDefinitionId: defId,
          props: s.props || {},
          orderIndex: order++,
        });
      }
    }

    return {
      success: true,
      message: '사이트 구성 요소가 DB에 적용되었습니다.',
      data: { pages: createdPages },
      type: 'site_composed',
      metadata: {
        executionTime: Date.now() - start,
        tokens: 0,
        model: 'gemini-2.5-flash',
      },
    };
  }
}

/**
 * 배포 설정 에이전트
 */
export class DeploymentSetupAgent implements Agent {
  name = 'DeploymentSetupAgent';
  description = '배포 설정 및 배포 준비';

  constructor(private model: any) {}

  canHandle(intent: string): boolean {
    const canHandle = intent === 'deployment_setup';
    console.log(`🚀 DeploymentSetupAgent.canHandle("${intent}"): ${canHandle}`);
    return canHandle;
  }

  async execute(
    message: string,
    intentAnalysis: IntentAnalysis,
    userContext: UserContext,
    sessionId: string
  ): Promise<AgentResult> {
    console.log('🚀 DeploymentSetupAgent 시작:', { message, sessionId });

    // 배포 설정 정보 생성
    const deploymentInfo = {
      platform: 'Vercel',
      domain: `navo-project-${Date.now()}.vercel.app`,
      buildSettings: {
        framework: 'Vite',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        installCommand: 'npm install',
      },
      environment: {
        NODE_VERSION: '18.x',
        NPM_FLAGS: '--legacy-peer-deps',
      },
      customDomains: [],
      ssl: true,
      cdn: true,
    };

    return {
      success: true,
      message: `🚀 **배포 설정이 완료되었습니다!**\n\n🌐 **배포 정보:**\n• 플랫폼: ${deploymentInfo.platform}\n• 도메인: ${deploymentInfo.domain}\n• 프레임워크: ${deploymentInfo.buildSettings.framework}\n• SSL: 활성화\n• CDN: 활성화\n\n🔗 **배포 링크:**\nhttps://${deploymentInfo.domain}\n\n✨ **배포 방법:**\n1. Vercel 계정 연결\n2. GitHub 저장소 연결\n3. 자동 배포 활성화\n\n🎉 **프로젝트가 완성되었습니다!**\n\n이제 실제 개발을 시작할 수 있습니다!`,
      data: deploymentInfo,
      type: 'deployment_setup',
    };
  }
}

/**
 * 컴포넌트 수정 에이전트
 */
export class ComponentModificationAgent implements Agent {
  name = 'ComponentModificationAgent';
  description = '컴포넌트 수정';

  constructor(private model: any) {}

  canHandle(intent: string): boolean {
    const canHandle = intent === 'component_modification';
    console.log(
      `🧩 ComponentModificationAgent.canHandle("${intent}"): ${canHandle}`
    );
    return canHandle;
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
        message:
          '현재 활성화된 프로젝트가 없습니다. 먼저 프로젝트를 선택해주세요.',
        type: 'text',
      };
    }

    const prompt = buildComponentModificationPrompt(
      userContext.currentComponent?.displayName,
      userContext.currentProject?.name
    );
    const result = await this.model.generateContent(
      `${prompt}\n\n사용자 요청: ${message}`
    );
    const response = result.response.text();

    try {
      const modificationData = JSON.parse(response);

      // 컴포넌트 업데이트
      if (userContext.currentComponent) {
        await db
          .update(components)
          .set({
            props: modificationData.code,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(components.id, userContext.currentComponent.id));
      }

      return {
        success: true,
        message: `컴포넌트 "${modificationData.componentName}"이 성공적으로 수정되었습니다! ✨\n\n변경사항:\n${Object.entries(
          modificationData.modifications
        )
          .map(([key, value]) => `- ${key}: ${value}`)
          .join('\n')}`,
        data: modificationData,
        type: 'component',
      };
    } catch (error) {
      return {
        success: false,
        message: '컴포넌트 수정 중 오류가 발생했습니다.',
        type: 'text',
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

  constructor(private model: any) {}

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
        message:
          '현재 활성화된 프로젝트가 없습니다. 먼저 프로젝트를 선택해주세요.',
        type: 'text',
      };
    }

    const prompt = buildPageModificationPrompt(
      userContext.currentProject?.name
    );
    const result = await this.model.generateContent(
      `${prompt}\n\n사용자 요청: ${message}`
    );
    const response = result.response.text();

    try {
      const modificationData = JSON.parse(response);

      return {
        success: true,
        message: `페이지 "${modificationData.pageName}"이 성공적으로 수정되었습니다! 📄\n\n변경사항:\n${Object.entries(
          modificationData.modifications
        )
          .map(([key, value]) => `- ${key}: ${value}`)
          .join('\n')}`,
        data: modificationData,
        type: 'page',
      };
    } catch (error) {
      return {
        success: false,
        message: '페이지 수정 중 오류가 발생했습니다.',
        type: 'text',
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

  constructor(private model: any) {}

  canHandle(intent: string): boolean {
    return intent === 'code_review';
  }

  async execute(
    message: string,
    intentAnalysis: IntentAnalysis,
    userContext: UserContext,
    sessionId: string
  ): Promise<AgentResult> {
    const result = await this.model.generateContent(
      `${CODE_REVIEW_PROMPT}\n\n코드 리뷰 요청: ${message}`
    );
    const response = result.response.text();

    try {
      const reviewData = JSON.parse(response);

      return {
        success: true,
        message: `코드 리뷰 완료! 📊\n\n점수: ${reviewData.score}/10\n\n발견된 문제점:\n${reviewData.issues.map((issue: string) => `- ${issue}`).join('\n')}\n\n개선 제안:\n${reviewData.suggestions.map((suggestion: string) => `- ${suggestion}`).join('\n')}`,
        data: reviewData,
        type: 'code',
      };
    } catch (error) {
      return {
        success: false,
        message: '코드 리뷰 중 오류가 발생했습니다.',
        type: 'text',
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

  constructor(private model: any) {}

  canHandle(intent: string): boolean {
    return intent === 'bug_fix';
  }

  async execute(
    message: string,
    intentAnalysis: IntentAnalysis,
    userContext: UserContext,
    sessionId: string
  ): Promise<AgentResult> {
    const result = await this.model.generateContent(
      `${BUG_FIX_PROMPT}\n\n버그 리포트: ${message}`
    );
    const response = result.response.text();

    try {
      const fixData = JSON.parse(response);

      return {
        success: true,
        message: `버그 수정 완료! 🐛✨\n\n버그: ${fixData.bugDescription}\n근본 원인: ${fixData.rootCause}\n해결 방안: ${fixData.solution}\n\n재발 방지: ${fixData.prevention}`,
        data: fixData,
        type: 'code',
      };
    } catch (error) {
      return {
        success: false,
        message: '버그 수정 중 오류가 발생했습니다.',
        type: 'text',
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

  constructor(private model: any) {}

  canHandle(intent: string): boolean {
    return intent === 'feature_request';
  }

  async execute(
    message: string,
    intentAnalysis: IntentAnalysis,
    userContext: UserContext,
    sessionId: string
  ): Promise<AgentResult> {
    const result = await this.model.generateContent(
      `${FEATURE_REQUEST_PROMPT}\n\n기능 요청: ${message}`
    );
    const response = result.response.text();

    try {
      const featureData = JSON.parse(response);

      return {
        success: true,
        message: `기능 요청 분석 완료! 🚀\n\n기능: ${featureData.featureName}\n설명: ${featureData.description}\n우선순위: ${featureData.priority}\n구현 방안: ${featureData.implementation}\n예상 시간: ${featureData.estimatedTime}`,
        data: featureData,
        type: 'text',
      };
    } catch (error) {
      return {
        success: false,
        message: '기능 요청 분석 중 오류가 발생했습니다.',
        type: 'text',
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

  constructor(private model: any) {}

  canHandle(intent: string): boolean {
    const canHandle = intent === 'general';
    console.log(
      `💬 GeneralConversationAgent.canHandle("${intent}"): ${canHandle}`
    );
    return canHandle;
  }

  async execute(
    message: string,
    intentAnalysis: IntentAnalysis,
    userContext: UserContext,
    sessionId: string
  ): Promise<AgentResult> {
    const result = await this.model.generateContent(
      `${GENERAL_CONVERSATION_PROMPT}\n\n사용자: ${message}`
    );
    const response = result.response.text();

    return {
      success: true,
      message: response,
      type: 'text',
    };
  }
}

/**
 * 질문 답변 에이전트
 */
export class QuestionAnswerAgent implements Agent {
  name = 'QuestionAnswerAgent';
  description = '질문 답변';

  constructor(private model: any) {}

  canHandle(intent: string): boolean {
    return intent === 'question';
  }

  async execute(
    message: string,
    intentAnalysis: IntentAnalysis,
    userContext: UserContext,
    sessionId: string
  ): Promise<AgentResult> {
    const result = await this.model.generateContent(
      `${QUESTION_ANSWER_PROMPT}\n\n질문: ${message}`
    );
    const response = result.response.text();

    return {
      success: true,
      message: response,
      type: 'text',
    };
  }
}
