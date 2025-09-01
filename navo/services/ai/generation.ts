import { GoogleGenerativeAI } from '@google/generative-ai';

// AI를 사용하여 프로젝트 콘텐츠 생성
export async function generateProjectContent(requirements: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const MAX_RETRIES = 3;
  let lastError: any = null;
  let originalRequirements = requirements;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prompt =
        attempt === 1
          ? `사용자 요구사항: "${originalRequirements}"

이 요구사항에 맞는 웹사이트를 생성해주세요. 다음을 포함해야 합니다:

1. 페이지 구조 (경로, 이름, 설명)
2. 컴포넌트 정의 (타입, props, 렌더링 템플릿, CSS)
3. 실제 기능이 동작하는 코드

JSON 형태로 응답해주세요. 다음과 같은 구조로:

{
  "pages": [
    {
      "path": "/",
      "name": "페이지 이름",
      "layoutJson": {
        "components": [
          { "type": "컴포넌트타입", "props": { "propName": "값" } }
        ]
      }
    }
  ],
  "components": [
    {
      "type": "컴포넌트타입",
      "displayName": "표시 이름",
      "category": "카테고리",
      "propsSchema": { "propName": { "type": "string" } },
      "renderTemplate": "<div>{{propName}}</div>",
      "cssStyles": "CSS 스타일"
    }
  ]
}`
          : requirements;

      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const response = await model.generateContent(prompt);
      const resultText = await response.response.text();
      const parsedResult = JSON.parse(resultText);

      if (
        parsedResult.pages &&
        Array.isArray(parsedResult.pages) &&
        parsedResult.components &&
        Array.isArray(parsedResult.components)
      ) {
        return parsedResult;
      } else {
        throw new Error('AI 응답의 구조가 올바르지 않습니다.');
      }
    } catch (error: any) {
      lastError = error;
      const resultText = lastError?.message || String(lastError);
      if (attempt < MAX_RETRIES) {
        requirements = `이전 시도에서 실패했습니다. 오류: ${resultText}\n\n원래 요구사항: "${originalRequirements}"\n\n오류를 수정하여 올바른 JSON 구조로 다시 생성해주세요. 설명이나 다른 텍스트 없이 순수한 JSON 객체만 응답해야 합니다.`;
      }
    }
  }

  const projectType = determineProjectType(originalRequirements);
  const pages = generateDefaultPages(projectType);
  const components = generateDefaultComponents(projectType);
  return { pages, components };
}

// 프로젝트 타입 결정
export function determineProjectType(requirements: string): string {
  const lower = requirements.toLowerCase();
  if (
    lower.includes('인스타그램') ||
    lower.includes('instagram') ||
    lower.includes('소셜')
  )
    return 'social';
  if (
    lower.includes('쇼핑') ||
    lower.includes('ecommerce') ||
    lower.includes('상점')
  )
    return 'ecommerce';
  if (lower.includes('블로그') || lower.includes('blog')) return 'blog';
  if (lower.includes('포트폴리오') || lower.includes('portfolio'))
    return 'portfolio';
  return 'general';
}

// 기본 페이지 생성
export function generateDefaultPages(projectType: string) {
  const basePages = [
    {
      path: '/',
      name: '메인 페이지',
      layoutJson: {
        components: [
          { type: 'Header', props: { title: '메인 페이지' } },
          {
            type: 'Content',
            props: { text: '메인 페이지에 오신 것을 환영합니다!' },
          },
        ],
      },
    },
  ];

  switch (projectType) {
    case 'social':
      basePages.push({
        path: '/profile',
        name: '프로필',
        layoutJson: {
          components: [
            { type: 'header', props: { title: '프로필' } },
            { type: 'profile', props: { title: '사용자' } },
          ],
        },
      });
      break;
    case 'ecommerce':
      basePages.push({
        path: '/products',
        name: '상품 목록',
        layoutJson: {
          components: [
            { type: 'header', props: { title: '상품' } },
            { type: 'product-grid', props: { title: '상품 목록' } },
          ],
        },
      });
      break;
  }

  return basePages;
}

// 기본 컴포넌트 생성
export function generateDefaultComponents(projectType: string) {
  return [
    {
      type: 'Header',
      displayName: 'Header',
      category: 'Layout',
      propsSchema: { title: { type: 'string' } },
      renderTemplate: '<header class="header"><h1>{{title}}</h1></header>',
      cssStyles:
        '.header { padding: 1rem; background: #f8f9fa; text-align: center; }',
    },
    {
      type: 'Content',
      displayName: 'Content',
      category: 'Display',
      propsSchema: { text: { type: 'string' } },
      renderTemplate: '<div class="content">{{text}}</div>',
      cssStyles:
        '.content { padding: 2rem; margin: 1rem; border: 1px solid #ddd; border-radius: 8px; }',
    },
  ];
}

// Generate layout components for a single page using LLM (structured JSON expected)
export async function generateLayoutComponentsForPage(page: {
  path: string;
  name?: string;
  description?: string;
}): Promise<Array<{ type: string; props: Record<string, any> }>> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  const prompt = `당신은 웹 페이지 레이아웃 설계 보조입니다. 아래 페이지 정보에 맞는 컴포넌트 인스턴스 배열만 JSON으로 출력하세요.

제약:
- 출력은 오직 JSON 객체 하나: { "components": [ { "type": string, "props": object } ] }
- components는 페이지의 레이아웃을 구성하는 컴포넌트 인스턴스 배열로 1개 이상이 될 수 있음
- 설명/주석/마크다운 금지
- props는 간결하게

페이지 정보:
path: ${page.path}
name: ${page.name || ''}
description: ${page.description || ''}
`;
  try {
    const res = await model.generateContent(prompt);
    const text = await res.response.text();
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed?.components) ? parsed.components : [];
    // Minimal validation
    return list
      .filter((c: any) => c && typeof c.type === 'string')
      .map((c: any) => ({
        type: String(c.type),
        props: (c.props as any) || {},
      }));
  } catch {
    return [];
  }
}
