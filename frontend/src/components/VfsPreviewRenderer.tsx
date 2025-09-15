'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useVfsTree, VfsNodeDto } from '@/hooks/api/useVfsTree';

interface VfsPreviewRendererProps {
  projectId: string;
  entryPath?: string;
  className?: string;
}

const iframeHtml = `
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>미리보기</title>
  <style id="preview-styles"></style>
  <style>
    body { margin: 0; font-family: sans-serif; }
    #root { width: 100%; height: 100vh; }
    .error-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.85); color: #ff5555;
      padding: 2rem; font-family: monospace; white-space: pre-wrap;
      z-index: 9999;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import React from 'https://esm.sh/react@18.2.0';
    import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';

    window.React = React;
    window.ReactDOM = ReactDOM;

    const handleError = (message) => {
      document.body.innerHTML = '<div id="root"></div>';
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-overlay';
      errorDiv.innerText = '런타임 오류:\n' + message;
      document.body.appendChild(errorDiv);
    };

    window.addEventListener('error', (event) => handleError(event.message));
    window.addEventListener('unhandledrejection', (event) => handleError(event.reason));

    window.addEventListener('message', async (event) => {
      if (event.data.type === 'LOAD_BUNDLE') {
        const errorOverlay = document.querySelector('.error-overlay');
        if (errorOverlay) errorOverlay.remove();

        const { js, css } = event.data.payload;

        const styleEl = document.getElementById('preview-styles');
        if (styleEl) styleEl.textContent = css;

        const oldScript = document.getElementById('bundle-script');
        if (oldScript) oldScript.remove();
        
        const blob = new Blob([js], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);

        try {
          const AppModule = await import(blobUrl);
          
          const container = document.getElementById('root');
          if (container && AppModule.default) {
            const root = ReactDOM.createRoot(container);
            root.render(React.createElement(AppModule.default));
          } else {
            throw new Error('진입점 파일에서 default export를 찾을 수 없습니다.');
          }
        } catch (e) {
          handleError(e.message);
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      }
    });
  </script>
</body>
</html>
`;

export function VfsPreviewRenderer({
  projectId,
  entryPath = 'src/app/page.tsx',
  className = '',
}: VfsPreviewRendererProps) {
  const { data: vfsTree, isLoading, isError, error } = useVfsTree(projectId);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const workerRef = useRef<Worker>();
  const [buildError, setBuildError] = useState<string | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/bundler.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    worker.postMessage({ type: 'INIT' });

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      if (type === 'INIT_SUCCESS') {
        console.log('번들러 워커가 초기화되었습니다.');
        if (vfsTree?.nodes) {
          build(vfsTree.nodes);
        }
      } else if (type === 'BUILD_COMPLETE') {
        setBuildError(null);
        iframeRef.current?.contentWindow?.postMessage({ type: 'LOAD_BUNDLE', payload }, '*');
      } else if (type === 'BUILD_ERROR') {
        console.error('빌드 오류:', payload);
        setBuildError(payload);
      }
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.terminate();
    };
  }, []);

  const build = useCallback((vfsNodes: VfsNodeDto[]) => {
    if (workerRef.current?.postMessage) {
        workerRef.current.postMessage({
            type: 'BUILD',
            payload: { entryPath, vfsNodes },
        });
    }
  }, [entryPath]);

  useEffect(() => {
    if (vfsTree?.nodes && workerRef.current) {
      build(vfsTree.nodes);
    }
  }, [vfsTree, build]);

  if (isLoading) {
    return <div className={className}>VFS 데이터를 불러오는 중...</div>;
  }

  if (isError) {
    return <div className={className}>VFS 로딩 오류: {error.message}</div>;
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        className="w-full h-full border-0"
        srcDoc={iframeHtml}
        title="VFS 미리보기"
      />
      {buildError && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-gray-900 bg-opacity-80 text-red-400 p-4 font-mono whitespace-pre-wrap">
          <h3 className="text-lg font-bold mb-2">빌드 실패</h3>
          {buildError}
        </div>
      )}
    </div>
  );
}
