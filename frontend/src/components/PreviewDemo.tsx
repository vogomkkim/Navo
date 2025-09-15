'use client';

import { useState } from 'react';
import { VfsPreviewRenderer } from './VfsPreviewRenderer';

// 이 컴포넌트는 VFS 기반 미리보기의 메인 통합 지점 역할을 합니다.
// 현재는 하드코딩된 projectId를 사용하지만, 실제 앱에서는 Context나 prop으로부터 값을 받아야 합니다.
const MOCK_PROJECT_ID = 'clyx6591n00012a6g3q2k62qf'; // 데이터베이스의 유효한 프로젝트 ID로 교체해야 합니다.

export function PreviewDemo() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [entryPath, setEntryPath] = useState('src/app/page.tsx');

  return (
    <div className="preview-demo">
      <div className="demo-header">
        <h2>VFS 실시간 미리보기</h2>
        <p>아래 내용은 가상 파일 시스템(VFS)으로부터 실시간으로 렌더링됩니다.</p>
      </div>

      <div className="demo-controls">
        <div className="layout-selector">
          <label htmlFor="entryPath">진입점 경로:</label>
          <input
            id="entryPath"
            type="text"
            value={entryPath}
            onChange={(e) => setEntryPath(e.target.value)}
            className="ml-2 p-1 border rounded"
            placeholder="예: src/app/page.tsx"
          />
        </div>

        <button
          className="fullscreen-toggle"
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          {isFullscreen ? '전체화면 종료' : '전체화면으로 보기'}
        </button>
      </div>

      <div className={`preview-container ${isFullscreen ? 'fullscreen' : ''}`}>
        <div className="preview-frame">
          <div className="preview-browser-bar">
            <div className="browser-buttons">
              <span className="browser-btn red"></span>
              <span className="browser-btn yellow"></span>
              <span className="browser-btn green"></span>
            </div>
            <div className="browser-address">
              navo-preview.vercel.app/{entryPath}
            </div>
          </div>

          <div className="preview-content-wrapper">
            {MOCK_PROJECT_ID ? (
              <VfsPreviewRenderer
                projectId={MOCK_PROJECT_ID}
                entryPath={entryPath}
              />
            ) : (
              <div className="p-4 text-center text-gray-500">
                미리보기를 활성화하려면 PreviewDemo.tsx 파일에
                유효한 MOCK_PROJECT_ID를 입력해주세요.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="demo-info">
        <h3>실시간 미리보기 기능</h3>
        <ul>
          <li>
            <strong>브라우저 내 번들링:</strong> TSX/JS/CSS 파일들이 웹 워커에서 실시간으로 번들링됩니다.
          </li>
          <li>
            <strong>안전한 렌더링:</strong> 번들된 코드는 보안을 위해 샌드박스 iframe 내에서 실행됩니다.
          </li>
          <li>
            <strong>실시간 업데이트:</strong> VFS의 내용이 변경되면 자동으로 다시 빌드하여 미리보기를 업데이트합니다.
          </li>
        </ul>

        <h4>적용 기술</h4>
        <div className="tech-stack">
          <span className="tech-badge">React</span>
          <span className="tech-badge">TypeScript</span>
          <span className="tech-badge">esbuild-wasm</span>
          <span className="tech-badge">Web Worker</span>
          <span className="tech-badge">Sandbox Iframe</span>
        </div>
      </div>
    </div>
  );
}
