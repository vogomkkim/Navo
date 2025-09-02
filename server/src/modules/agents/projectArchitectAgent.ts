/**
 * Project Architect Agent (기존 Error Analyzer 확장)
 *
 * AI를 사용하여 프로젝트 요구사항을 분석하고 아키텍처를 설계하는 에이전트
 * 에러 해결과 프로젝트 설계를 모두 지원합니다.
 */

import { BaseAgent, ProjectRequest } from './core/masterDeveloper';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { refineJsonResponse } from './utils/jsonRefiner';

export class ProjectArchitectAgent extends BaseAgent {
  private model: any;

  constructor() {
    super('ProjectArchitectAgent', 1); // 최고 우선순위

    // Gemini API 초기화
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * 이 에이전트가 처리할 수 있는 요청인지 확인
   * Project Architect Agent는 프로젝트 설계와 에러 분석을 모두 지원
   */
  canHandle(request: any): boolean {
    // 프로젝트 생성 요청인지 확인
    if (
      request &&
      typeof request === 'object' &&
      request.name &&
      request.description
    ) {
      return true; // 프로젝트 설계 요청
    }

    return false;
  }

  /**
   * 프로젝트 설계 또는 에러 분석 실행
   */
  async execute(request: any, context: any): Promise<any> {
    try {
      // 프로젝트 설계 요청인지 확인
      if (
        request &&
        typeof request === 'object' &&
        request.name &&
        request.description
      ) {
        return await this.designProject(request, context);
      }

      throw new Error('지원하지 않는 요청 타입입니다.');
    } catch (e) {
      this.logger.error('Project Architect Agent 실행 실패:', { error: e });
      throw e;
    }
  }

  /**
   * 프로젝트 설계 실행
   */
  private async designProject(request: any, context: any): Promise<any> {
    try {
      this.logger.info('🏗️ 프로젝트 아키텍처 설계 시작', { request });

      // AI를 사용한 프로젝트 아키텍처 설계
      const architecture = await this.designArchitectureWithAI(request);

      this.logger.info('✅ 프로젝트 아키텍처 설계 완료', { architecture });

      return {
        success: true,
        architecture,
        executionTime: Date.now(),
        nextSteps: [
          '아키텍처 설계 완료: UI/UX Designer Agent가 인터페이스를 설계합니다',
          'Code Generator Agent가 실제 코드를 생성합니다',
          'Development Guide Agent가 개발 가이드를 작성합니다',
        ],
      };
    } catch (e) {
      this.logger.error('프로젝트 설계 실패:', { error: e });
      throw e;
    }
  }

  /**
   * AI를 사용하여 프로젝트 아키텍처 설계
   */
  private async designArchitectureWithAI(
    request: ProjectRequest
  ): Promise<any> {
    try {
      this.logger.info('🏗️ AI 아키텍처 설계 시작 (단계별 처리)', { request });

      // 1단계: 프로젝트 기본 정보 생성
      this.logger.info('📝 1단계: 프로젝트 기본 정보 생성 중...');
      const projectBasic = await this.createProjectBasic(request);

      // 2단계: 페이지 구조 설계
      this.logger.info('📄 2단계: 페이지 구조 설계 중...');
      const pageStructure = await this.createPageStructure(
        request,
        projectBasic
      );

      // 3단계: 컴포넌트 정의
      this.logger.info('🧩 3단계: 컴포넌트 정의 중...');
      const components = await this.createComponents(request, pageStructure);

      // 4단계: 최종 프로젝트 구조 조합
      this.logger.info('🔗 4단계: 최종 구조 조합 중...');
      const finalArchitecture = this.combineArchitecture(
        projectBasic,
        pageStructure,
        components
      );

      // 생성된 구조 검증
      this.validateProjectStructure(finalArchitecture);

      this.logger.info('✅ AI 아키텍처 설계 완료 (단계별 처리)', {
        totalFiles: this.countFiles(finalArchitecture.project.file_structure),
        steps: ['프로젝트 기본', '페이지 구조', '컴포넌트', '최종 조합'],
      });

      return finalArchitecture;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('AI 아키텍처 설계 실패:', { error: errorMessage });
      throw new Error(`AI 아키텍처 설계 실패: ${errorMessage}`);
    }
  }

  // 1단계: 프로젝트 기본 정보 생성
  private async createProjectBasic(request: ProjectRequest): Promise<any> {
    const prompt = `다음 프로젝트의 기본 정보를 생성하세요:

프로젝트: ${request.name}
설명: ${request.description}
타입: ${request.type}

**요구사항:**
1. 프로젝트명은 영어로 된 간결하고 기억하기 쉬운 이름으로 생성
2. 설명은 구체적이고 명확하게 작성
3. 타입은 적절한 카테고리로 분류

**응답 형식 (JSON만):**
{
  "project": {
    "name": "QuizMaster",
    "description": "AI 기반 퀴즈 학습 플랫폼으로, 사용자가 퀴즈를 만들고 공유하며 학습할 수 있습니다.",
    "type": "web-application"
  }
}

**주의사항:**
- 프로젝트 기본 정보만 반환
- 파일 구조는 포함하지 않음
- JSON 형식만 응답
- 프로젝트명은 영어로, 브랜딩 가능한 이름으로`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();

    try {
      const refinedJson = await refineJsonResponse(text);
      return JSON.parse(refinedJson);
    } catch (error) {
      this.logger.warn('⚠️ 1단계 실패, 기본값 사용', { error });
      return {
        project: {
          name: this.generateDefaultProjectName(request.name),
          description:
            request.description || `AI가 생성한 ${request.name} 프로젝트`,
          type: request.type || 'web-application',
        },
      };
    }
  }

  // 기본 프로젝트명 생성 헬퍼 메서드
  private generateDefaultProjectName(requestName: string): string {
    const timestamp = Date.now();

    const nameMap: { [key: string]: string[] } = {
      퀴즐렛: ['QuizMaster', 'QuizHub', 'QuizZone', 'QuizLab', 'QuizStudio'],
      퀴즈: ['QuizHub', 'QuizMaster', 'QuizZone', 'QuizLab', 'QuizStudio'],
      학습: ['LearnFlow', 'StudyHub', 'EduZone', 'LearnLab', 'StudyStudio'],
      교육: ['EduTech', 'EduHub', 'EduZone', 'EduLab', 'EduStudio'],
      커머스: [
        'ShopSmart',
        'CommerceHub',
        'ShopZone',
        'ShopLab',
        'CommerceStudio',
      ],
      쇼핑: ['BuyEasy', 'ShopHub', 'ShopZone', 'ShopLab', 'BuyStudio'],
      블로그: ['BlogSpace', 'BlogHub', 'BlogZone', 'BlogLab', 'BlogStudio'],
      소셜: [
        'SocialConnect',
        'SocialHub',
        'SocialZone',
        'SocialLab',
        'SocialStudio',
      ],
      게임: ['GameZone', 'GameHub', 'GameLab', 'GameStudio', 'PlayZone'],
      엔터테인먼트: [
        'EntertainHub',
        'EntertainZone',
        'EntertainLab',
        'EntertainStudio',
        'FunHub',
      ],
    };

    for (const [korean, englishNames] of Object.entries(nameMap)) {
      if (requestName.includes(korean)) {
        return englishNames[timestamp % englishNames.length];
      }
    }

    // 기본 창의적인 영어 이름들
    const defaultNames = [
      'NeoSpace',
      'FutureHub',
      'InnovationZone',
      'CreativeLab',
      'TechFlow',
      'DigitalStudio',
      'IdeaFactory',
      'SmartWorks',
      'CloudNest',
      'DataHub',
      'CodeStudio',
      'WebCraft',
      'AppMaster',
      'DigitalArt',
      'TechMaster',
      'MagicLab',
      'CraftZone',
      'FactorySpace',
      'StudioHub',
      'FlowCraft',
      'NeoMagic',
      'FutureCraft',
      'InnovationMagic',
      'CreativeMagic',
      'TechCraft',
      'DigitalMagic',
      'IdeaCraft',
      'SmartMagic',
      'CloudCraft',
      'DataMagic',
    ];

    return defaultNames[timestamp % defaultNames.length];
  }

  // 2단계: 페이지 구조 설계
  private async createPageStructure(
    request: ProjectRequest,
    projectBasic: any
  ): Promise<any> {
    const prompt = `다음 프로젝트의 페이지 구조만 생성하세요:

프로젝트: ${projectBasic.project.name}
설명: ${projectBasic.project.description}

**응답 형식 (JSON만):**
{
  "pages": [
    {
      "name": "페이지명",
      "path": "경로",
      "description": "페이지 설명",
      "type": "페이지 타입"
    }
  ]
}

**주의사항:**
- 페이지 목록만 반환 (최대 5개)
- 각 페이지의 기본 정보만
- JSON 형식만 응답`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();

    try {
      const refinedJson = await refineJsonResponse(text);
      return JSON.parse(refinedJson);
    } catch (error) {
      this.logger.warn('⚠️ 2단계 실패, 기본 페이지 사용', { error });
      return {
        pages: [
          {
            name: 'Home',
            path: '/',
            description: '메인 페이지',
            type: 'page',
          },
          {
            name: 'Login',
            path: '/login',
            description: '로그인 페이지',
            type: 'auth',
          },
        ],
      };
    }
  }

  // 3단계: 컴포넌트 정의
  private async createComponents(
    request: ProjectRequest,
    pageStructure: any
  ): Promise<any> {
    const prompt = `다음 프로젝트의 기본 컴포넌트만 생성하세요:

프로젝트: ${request.name}
페이지: ${pageStructure.pages.map((p: any) => p.name).join(', ')}

**응답 형식 (JSON만):**
{
  "components": [
    {
      "name": "컴포넌트명",
      "type": "컴포넌트 타입",
      "description": "컴포넌트 설명",
      "props": ["prop1", "prop2"]
    }
  ]
}

**주의사항:**
- 기본 컴포넌트만 반환 (최대 5개)
- 각 컴포넌트의 기본 정보만
- JSON 형식만 응답`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();

    try {
      const refinedJson = await refineJsonResponse(text);
      return JSON.parse(refinedJson);
    } catch (error) {
      this.logger.warn('⚠️ 3단계 실패, 기본 컴포넌트 사용', { error });
      return {
        components: [
          {
            name: 'Header',
            type: 'layout',
            description: '페이지 헤더',
            props: ['title', 'navigation'],
          },
          {
            name: 'Button',
            type: 'ui',
            description: '기본 버튼',
            props: ['text', 'onClick', 'variant'],
          },
        ],
      };
    }
  }

  // 4단계: 최종 구조 조합
  private combineArchitecture(
    projectBasic: any,
    pageStructure: any,
    components: any
  ): any {
    // 간단한 파일 구조 생성
    const fileStructure = {
      type: 'folder',
      name: projectBasic.project.name,
      children: [
        {
          type: 'file',
          name: 'package.json',
          content: JSON.stringify(
            {
              name: projectBasic.project.name,
              version: '1.0.0',
              description: projectBasic.project.description,
              main: 'index.js',
              scripts: { start: 'node index.js' },
            },
            null,
            2
          ),
        },
        {
          type: 'file',
          name: 'README.md',
          content: `# ${projectBasic.project.name}\n\n${projectBasic.project.description}\n\n## 페이지\n${pageStructure.pages.map((p: any) => `- ${p.name}: ${p.description}`).join('\n')}\n\n## 컴포넌트\n${components.components.map((c: any) => `- ${c.name}: ${c.description}`).join('\n')}`,
        },
      ],
    };

    return {
      project: {
        ...projectBasic.project,
        file_structure: fileStructure,
        pages: pageStructure.pages,
        components: components.components,
      },
    };
  }

  // 프로젝트 구조 검증
  private validateProjectStructure(architecture: any): void {
    if (
      !architecture ||
      !architecture.project ||
      !architecture.project.file_structure
    ) {
      throw new Error('생성된 프로젝트 구조가 올바르지 않습니다.');
    }

    const fileStructure = architecture.project.file_structure;
    if (
      fileStructure.type !== 'folder' ||
      fileStructure.name !== architecture.project.name
    ) {
      throw new Error(
        '프로젝트 루트 폴더의 이름이 프로젝트 이름과 일치하지 않습니다.'
      );
    }

    if (!fileStructure.children || !Array.isArray(fileStructure.children)) {
      throw new Error(
        '프로젝트 루트 폴더에 파일 또는 폴더 목록이 포함되지 않았습니다.'
      );
    }

    // 파일 개수 확인
    const totalFiles = this.countFiles(fileStructure);
    if (totalFiles === 0) {
      throw new Error('생성된 프로젝트에 파일이 하나도 없습니다.');
    }
  }

  // 파일 개수 세기
  private countFiles(node: any): number {
    let count = 0;
    if (node.type === 'file') {
      count++;
    } else if (node.type === 'folder') {
      if (node.children) {
        count += node.children.length;
        for (const child of node.children) {
          count += this.countFiles(child);
        }
      }
    }
    return count;
  }
}
