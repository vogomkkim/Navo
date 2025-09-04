'use client';

import { useState } from 'react';

import { ComponentDefinitionContext } from '@/app/context/ComponentDefinitionContext';
import { LayoutProvider } from '@/app/context/LayoutContext';

import { LayoutRenderer } from './LayoutRenderer';

// Mock component definitions for demo
const mockComponentDefinitions = [
  {
    id: 'header-def',
    name: 'Header',
    display_name: '헤더',
    description: '페이지 헤더 컴포넌트',
    category: 'basic',
    props_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', title: '제목' },
        subtitle: { type: 'string', title: '부제목' },
      },
    },
    render_template:
      '<header class="component-header" data-id="{{id}}"><h1 data-editable="true" data-prop-name="title">{{title}}</h1><h2 data-editable="true" data-prop-name="subtitle">{{subtitle}}</h2></header>',
    css_styles:
      '.component-header { padding: 2rem; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 0.5rem; margin-bottom: 1rem; }',
  },
  {
    id: 'hero-def',
    name: 'Hero',
    display_name: '히어로 섹션',
    description: '메인 히어로 섹션',
    category: 'basic',
    props_schema: {
      type: 'object',
      properties: {
        headline: { type: 'string', title: '헤드라인' },
        cta: { type: 'string', title: '콜투액션' },
      },
    },
    render_template:
      '<section class="component-hero" data-id="{{id}}"><div class="hero-content"><h2 data-editable="true" data-prop-name="headline">{{headline}}</h2><button data-editable="true" data-prop-name="cta" class="cta-button">{{cta}}</button></div></section>',
    css_styles:
      '.component-hero { text-align: center; padding: 3rem 1rem; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 0.5rem; margin-bottom: 1rem; } .hero-content { max-width: 800px; margin: 0 auto; } .cta-button { background: rgba(255,255,255,0.2); color: white; border: 2px solid white; padding: 1rem 2rem; border-radius: 2rem; font-size: 1.125rem; margin-top: 2rem; cursor: pointer; transition: all 0.3s; } .cta-button:hover { background: white; color: #f5576c; }',
  },
  {
    id: 'features-def',
    name: 'Features',
    display_name: '특징 섹션',
    description: '서비스 특징을 보여주는 섹션',
    category: 'content',
    props_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', title: '섹션 제목' },
        features: { type: 'array', title: '특징 목록' },
      },
    },
    render_template:
      '<section class="component-features" data-id="{{id}}"><h3 data-editable="true" data-prop-name="title">{{title}}</h3><div class="features-grid">{{features}}</div></section>',
    css_styles:
      '.component-features { padding: 2rem; background: #f8fafc; border-radius: 0.5rem; margin-bottom: 1rem; } .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-top: 1rem; }',
  },
  {
    id: 'footer-def',
    name: 'Footer',
    display_name: '푸터',
    description: '페이지 푸터',
    category: 'basic',
    props_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', title: '푸터 텍스트' },
      },
    },
    render_template:
      '<footer class="component-footer" data-id="{{id}}"><p data-editable="true" data-prop-name="text">{{text}}</p></footer>',
    css_styles:
      '.component-footer { padding: 1.5rem; text-align: center; background: #1f2937; color: #9ca3af; border-radius: 0.5rem; }',
  },
];

// Mock layout data for different page types
const mockLayouts = {
  landing: {
    components: [
      {
        id: 'header-1',
        type: 'Header',
        props: {
          title: 'AI 기반 웹사이트 빌더',
          subtitle: '코드 한 줄 없이 완벽한 웹사이트를 만들어보세요',
        },
      },
      {
        id: 'hero-1',
        type: 'Hero',
        props: {
          headline: '환영합니다! 🚀',
          cta: '무료로 시작하기',
        },
      },
      {
        id: 'features-1',
        type: 'Features',
        props: {
          title: '주요 특징',
          features:
            '<div class="feature-card"><h4>🤖 AI 기반</h4><p>인공지능이 최적의 디자인을 제안합니다</p></div><div class="feature-card"><h4>⚡ 빠른 배포</h4><p>몇 분 안에 웹사이트가 완성됩니다</p></div><div class="feature-card"><h4>🎨 커스터마이징</h4><p>원하는 대로 디자인을 수정할 수 있습니다</p></div>',
        },
      },
      {
        id: 'footer-1',
        type: 'Footer',
        props: {
          text: '© 2024 Navo - AI 기반 웹사이트 빌더',
        },
      },
    ],
  },
  business: {
    components: [
      {
        id: 'header-2',
        type: 'Header',
        props: {
          title: '비즈니스 솔루션',
          subtitle: '기업을 위한 전문적인 웹사이트',
        },
      },
      {
        id: 'hero-2',
        type: 'Hero',
        props: {
          headline: '비즈니스를 성장시키세요',
          cta: '문의하기',
        },
      },
      {
        id: 'features-2',
        type: 'Features',
        props: {
          title: '기업 솔루션',
          features:
            '<div class="feature-card"><h4>📊 분석 대시보드</h4><p>실시간 비즈니스 인사이트</p></div><div class="feature-card"><h4>🔒 보안 보장</h4><p>기업 수준의 보안 솔루션</p></div><div class="feature-card"><h4>📞 24/7 지원</h4><p>언제든지 전문가 지원</p></div>',
        },
      },
      {
        id: 'footer-2',
        type: 'Footer',
        props: {
          text: '© 2024 Business Solutions Inc.',
        },
      },
    ],
  },
  portfolio: {
    components: [
      {
        id: 'header-3',
        type: 'Header',
        props: {
          title: '포트폴리오',
          subtitle: '제 작품들을 소개합니다',
        },
      },
      {
        id: 'hero-3',
        type: 'Hero',
        props: {
          headline: '창의적인 개발자',
          cta: '프로젝트 보기',
        },
      },
      {
        id: 'features-3',
        type: 'Features',
        props: {
          title: '기술 스택',
          features:
            '<div class="feature-card"><h4>⚛️ React</h4><p>현대적인 프론트엔드 개발</p></div><div class="feature-card"><h4>🟦 TypeScript</h4><p>타입 안전한 코드 작성</p></div><div class="feature-card"><h4>🎨 디자인</h4><p>사용자 경험 중심 디자인</p></div>',
        },
      },
      {
        id: 'footer-3',
        type: 'Footer',
        props: {
          text: '© 2024 Developer Portfolio',
        },
      },
    ],
  },
};

export function PreviewDemo() {
  const [selectedLayout, setSelectedLayout] =
    useState<keyof typeof mockLayouts>('landing');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mock component registry
  const mockComponentRegistry = new Map(
    mockComponentDefinitions.map((def) => [def.name, def]),
  );

  return (
    <div className="preview-demo">
      <div className="demo-header">
        <h2>🚀 프리뷰 시스템 데모</h2>
        <p>다른 레이아웃을 선택하여 동적 렌더링을 확인해보세요</p>
      </div>

      <div className="demo-controls">
        <div className="layout-selector">
          <label>페이지 타입 선택:</label>
          <select
            value={selectedLayout}
            onChange={(e) =>
              setSelectedLayout(e.target.value as keyof typeof mockLayouts)
            }
          >
            <option value="landing">랜딩 페이지</option>
            <option value="business">비즈니스 페이지</option>
            <option value="portfolio">포트폴리오</option>
          </select>
        </div>

        <button
          className="fullscreen-toggle"
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          {isFullscreen ? '🗗️ 축소' : '🗖️ 전체화면'}
        </button>
      </div>

      <div className={`preview-container ${isFullscreen ? 'fullscreen' : ''}`}>
        <ComponentDefinitionContext.Provider
          value={{
            componentRegistry: mockComponentRegistry,
            isLoading: false,
            isError: false,
            error: null,
          }}
        >
          <LayoutProvider>
            <div className="preview-frame">
              <div className="preview-browser-bar">
                <div className="browser-buttons">
                  <span className="browser-btn red"></span>
                  <span className="browser-btn yellow"></span>
                  <span className="browser-btn green"></span>
                </div>
                <div className="browser-address">
                  navo-preview.vercel.app/{selectedLayout}
                </div>
              </div>

              <div className="preview-content-wrapper">
                <LayoutRenderer layout={mockLayouts[selectedLayout]} />
              </div>
            </div>
          </LayoutProvider>
        </ComponentDefinitionContext.Provider>
      </div>

      <div className="demo-info">
        <h3>✨ 데모 특징</h3>
        <ul>
          <li>
            <strong>동적 컴포넌트 렌더링:</strong> JSON 데이터로부터 컴포넌트를
            실시간으로 생성
          </li>
          <li>
            <strong>편집 가능한 텍스트:</strong> data-editable 속성이 있는
            요소를 클릭하여 수정
          </li>
          <li>
            <strong>반응형 디자인:</strong> 모든 레이아웃이 모바일과 데스크톱에
            최적화
          </li>
          <li>
            <strong>컴포넌트 재사용:</strong> 동일한 컴포넌트를 다른 페이지에서
            재사용
          </li>
        </ul>

        <h4>🛠️ 기술 스택</h4>
        <div className="tech-stack">
          <span className="tech-badge">React</span>
          <span className="tech-badge">TypeScript</span>
          <span className="tech-badge">Tailwind CSS</span>
          <span className="tech-badge">PostgreSQL</span>
          <span className="tech-badge">Fastify</span>
        </div>
      </div>
    </div>
  );
}
