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

    const bundleCache = new Map();
    let root = null;

    const handleError = (message, error) => {
      console.error(message, error);
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-overlay';
      errorDiv.innerText = message + '\n' + (error?.message || '');
      document.body.appendChild(errorDiv);
    };

    window.addEventListener('error', (event) => handleError('런타임 오류:', event.error));
    window.addEventListener('unhandledrejection', (event) => handleError('처리되지 않은 Promise 거부:', event.reason));

    async function renderPage(path) {
      try {
        const errorOverlay = document.querySelector('.error-overlay');
        if (errorOverlay) errorOverlay.remove();

        const layoutPath = 'dist/src/app/layout.js';
        const pagePath = `dist/src/app${path === '/' ? '' : path}/page.js`;

        const LayoutModule = await import(bundleCache.get(layoutPath));
        const PageModule = await import(bundleCache.get(pagePath));

        if (!LayoutModule || !LayoutModule.default) {
          throw new Error('layout.tsx에서 default export를 찾을 수 없습니다.');
        }
        if (!PageModule || !PageModule.default) {
          throw new Error(`
${pagePath}에 해당하는 페이지에서 default export를 찾을 수 없습니다.`);
        }

        const Layout = LayoutModule.default;
        const Page = PageModule.default;
        
        if (!root) {
          const container = document.getElementById('root');
          root = ReactDOM.createRoot(container);
        }
        
        root.render(React.createElement(Layout, null, React.createElement(Page)));

      } catch (e) {
        handleError('페이지 렌더링 오류:', e);
      }
    }

    window.addEventListener('click', (event) => {
      let target = event.target.closest('a');
      if (target) {
        const href = target.getAttribute('href');
        if (href && href.startsWith('/')) {
          event.preventDefault();
          history.pushState({}, '', href);
          renderPage(href);
        }
      }
    });

    window.addEventListener('popstate', () => {
      renderPage(window.location.pathname);
    });

    window.addEventListener('message', async (event) => {
      if (event.data.type === 'LOAD_BUNDLE') {
        const { outputFiles } = event.data.payload;
        
        // Revoke old blob URLs and clear cache
        bundleCache.forEach(url => URL.revokeObjectURL(url));
        bundleCache.clear();

        let cssContent = '';
        for (const file of outputFiles) {
          const blob = new Blob([file.text], { type: file.path.endsWith('.css') ? 'text/css' : 'application/javascript' });
          bundleCache.set(file.path, URL.createObjectURL(blob));
          if(file.path.endsWith('.css')) {
            cssContent += file.text;
          }
        }

        const styleEl = document.getElementById('preview-styles');
        if (styleEl) styleEl.textContent = cssContent;
        
        // Initial render
        renderPage(window.location.pathname || '/');
      }
    });
  </script>
</body>
</html>
`

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
        const errorMessage = payload.error?.message || '알 수 없는 빌드 오류';
        setBuildError(errorMessage);
      }
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.terminate();
    };
  }, [vfsTree]); // Re-create worker if vfsTree instance changes (though it shouldn't)

  const build = useCallback((vfsNodes: VfsNodeDto[]) => {
    if (workerRef.current?.postMessage) {
        workerRef.current.postMessage({
            type: 'BUILD',
            payload: { 
              // entryPoint is now used as a fallback by the worker
              entryPoint: entryPath, 
              vfsNodes 
            },
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
