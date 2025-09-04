'use client';

import { useState } from 'react';

import { useGenerateComponent } from '@/hooks/api';

export function ComponentBuilderSection() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [componentDescription, setComponentDescription] = useState('');
  const [generationStatus, setGenerationStatus] = useState('');
  const [generatedComponent, setGeneratedComponent] = useState<any>(null);

  const {
    mutate: generateComponent,
    isPending,
    isSuccess,
    isError,
    error,
  } = useGenerateComponent();

  const togglePanel = () => {
    setIsPanelOpen((prev) => !prev);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  const handleGenerateComponent = () => {
    if (!componentDescription.trim()) {
      setGenerationStatus('설명을 입력해주세요.');
      return;
    }
    setGenerationStatus('생성 중...');
    setGeneratedComponent(null);
    generateComponent(
      {
        description: componentDescription,
      },
      {
        onSuccess: (data) => {
          setGenerationStatus('컴포넌트가 성공적으로 생성되었습니다!');
          setGeneratedComponent(data.component);
          console.log('Generated Component:', data.component);
        },
        onError: (err) => {
          setGenerationStatus(`오류: ${err.message}`);
          console.error('Component generation failed:', err);
        },
      },
    );
  };

  return (
    <>
      <div className="panel-section component-builder-toggle-section">
        <button
          id="toggleComponentBuilderBtn"
          className="toggle-section-btn"
          onClick={togglePanel}
        >
          🧩 컴포넌트 생성
        </button>
      </div>

      <div
        className={`component-builder-panel ${isPanelOpen ? 'open' : ''}`}
        id="componentBuilderPanel"
      >
        <div className="panel-section component-builder-section">
          <div className="section-header">
            <h2>컴포넌트 생성</h2>
            <button
              id="closeComponentBuilderBtn"
              className="close-btn"
              onClick={closePanel}
            >
              ×
            </button>
          </div>
          <div className="natural-language-input">
            <textarea
              id="componentDescription"
              placeholder="원하는 컴포넌트를 설명하세요...&#10;&#10;예시:&#10;• 이미지를 그리드로 보여주는 사진 갤러리&#10;• 이름, 이메일, 메시지 필드가 있는 연락처 폼&#10;• 세 개의 열이 있는 가격표&#10;• 큰 제목과 행동 유도 버튼이 있는 히어로 섹션"
              rows={6}
              value={componentDescription}
              onChange={(e) => setComponentDescription(e.target.value)}
            ></textarea>
            <button
              id="generateComponentBtn"
              className="generate-component-btn"
              onClick={handleGenerateComponent}
              disabled={isPending}
            >
              {isPending ? '생성 중...' : '🚀 컴포넌트 생성'}
            </button>
          </div>
          <div id="generationStatus" className="generation-status">
            {generationStatus && <p>{generationStatus}</p>}
          </div>
          {generatedComponent && (
            <div className="component-preview">
              <h5>생성된 컴포넌트:</h5>
              <pre>{JSON.stringify(generatedComponent, null, 2)}</pre>
              {/* TODO: Add buttons to apply/save component */}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
