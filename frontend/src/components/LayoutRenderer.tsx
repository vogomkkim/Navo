'use client';

import { DynamicComponentRenderer } from './DynamicComponentRenderer';

interface LayoutComponent {
  id: string;
  type: string;
  props: Record<string, any>;
}

interface Layout {
  components: LayoutComponent[];
}

interface LayoutRendererProps {
  layout: Layout | null;
}

export function LayoutRenderer({ layout }: LayoutRendererProps) {
  if (
    !layout ||
    !Array.isArray(layout.components) ||
    layout.components.length === 0
  ) {
    return (
      <div className="preview-placeholder">
        <div className="preview-header">
          <div className="preview-icon">🚀</div>
          <h2>프로젝트 미리보기</h2>
          <p>AI와 대화하여 프로젝트를 시작해보세요</p>
        </div>

        <div className="preview-features">
          <div className="feature-card">
            <div className="feature-icon">💡</div>
            <h3>아이디어 구체화</h3>
            <p>AI가 당신의 아이디어를 구체적인 프로젝트로 발전시킵니다</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>빠른 프로토타이핑</h3>
            <p>몇 분 안에 완성된 웹사이트를 확인할 수 있습니다</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎨</div>
            <h3>자동 디자인</h3>
            <p>AI가 최신 디자인 트렌드를 반영한 UI를 생성합니다</p>
          </div>
        </div>

        <div className="preview-actions">
          <div className="action-hint">
            <span className="hint-icon">💬</span>
            <span>
              왼쪽 채팅에서 &quot;전자상거래 웹사이트 만들어줘&quot;라고
              말해보세요
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {layout.components.map((comp) => (
        <DynamicComponentRenderer key={comp.id} component={comp} />
      ))}
    </>
  );
}
