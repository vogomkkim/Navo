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
      background: rgba(0,0,0,0.95); color: #ff5555;
      padding: 2rem; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      white-space: pre-wrap; z-index: 9999; overflow-y: auto;
      font-size: 14px; line-height: 1.5;
    }
    .error-header {
      font-size: 18px; font-weight: bold; margin-bottom: 1rem;
      color: #ff6b6b; border-bottom: 2px solid #ff6b6b;
      padding-bottom: 0.5rem;
    }
    .error-type {
      background: #ff6b6b; color: white; padding: 0.25rem 0.5rem;
      border-radius: 4px; font-size: 12px; margin-bottom: 1rem;
      display: inline-block;
    }
    .error-message {
      background: rgba(255, 107, 107, 0.1); padding: 1rem;
      border-left: 4px solid #ff6b6b; margin: 1rem 0;
      border-radius: 0 4px 4px 0;
    }
    .error-stack {
      background: rgba(0,0,0,0.3); padding: 1rem;
      border-radius: 4px; margin-top: 1rem;
      font-size: 12px; color: #ccc;
    }
    .error-actions {
      margin-top: 1rem; padding-top: 1rem;
      border-top: 1px solid #444;
    }
    .error-button {
      background: #ff6b6b; color: white; border: none;
      padding: 0.5rem 1rem; border-radius: 4px;
      cursor: pointer; margin-right: 0.5rem;
      font-size: 12px;
    }
    .error-button:hover { background: #ff5252; }
    .compile-error { border-left-color: #ff9800; }
    .compile-error .error-type { background: #ff9800; }
    .runtime-error { border-left-color: #f44336; }
    .runtime-error .error-type { background: #f44336; }
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

    const createErrorOverlay = (errorData) => {
      const errorDiv = document.createElement('div');
      errorDiv.className = \`error-overlay \${errorData.type}-error\`;

      const isCompileError = errorData.type === 'compile';
      const errorTypeText = isCompileError ? '컴파일 오류' : '런타임 오류';

      errorDiv.innerHTML = \`
        <div class="error-header">🚨 \${errorTypeText}</div>
        <div class="error-type">\${errorTypeText}</div>
        <div class="error-message">\${errorData.message}</div>
        \${errorData.stack ? \`<div class="error-stack">\${errorData.stack}</div>\` : ''}
        \${errorData.codeFrame ? \`<div class="error-stack">\${errorData.codeFrame}</div>\` : ''}
        <div class="error-actions">
          <button class="error-button" onclick="this.parentElement.parentElement.remove()">닫기</button>
          <button class="error-button" onclick="window.location.reload()">새로고침</button>
        </div>
      \`;

      document.body.appendChild(errorDiv);
    };

    const handleRuntimeError = (message, error) => {
      console.error(message, error);
      createErrorOverlay({
        type: 'runtime',
        message: \`\${message}\\n\${error?.message || ''}\`,
        stack: error?.stack || ''
      });
    };

    window.addEventListener('error', (event) => handleRuntimeError('런타임 오류:', event.error));
    window.addEventListener('unhandledrejection', (event) => handleRuntimeError('처리되지 않은 Promise 거부:', event.reason));

    // Page routing cache
    const pageCache = new Map();

    async function renderPage(path) {
      try {
        const errorOverlay = document.querySelector('.error-overlay');
        if (errorOverlay) errorOverlay.remove();

        // Normalize path
        const normalizedPath = path === '/' ? '' : path;
        const layoutPath = 'dist/src/app/layout.js';
        const pagePath = `dist/src/app${normalizedPath}/page.js`;

        // Check if we have cached modules
        let LayoutModule, PageModule;

        if (pageCache.has(layoutPath)) {
          LayoutModule = pageCache.get(layoutPath);
        } else {
          LayoutModule = await import(bundleCache.get(layoutPath));
          pageCache.set(layoutPath, LayoutModule);
        }

        if (pageCache.has(pagePath)) {
          PageModule = pageCache.get(pagePath);
        } else {
          PageModule = await import(bundleCache.get(pagePath));
          pageCache.set(pagePath, PageModule);
        }

        if (!LayoutModule || !LayoutModule.default) {
          throw new Error('layout.tsx에서 default export를 찾을 수 없습니다.');
        }
        if (!PageModule || !PageModule.default) {
          // Try to find alternative page files
          const alternativePaths = [
            `dist/src/app${normalizedPath}/index.js`,
            `dist/src/app${normalizedPath}/index.tsx`,
            `dist/src/app/page.js` // fallback to root page
          ];

          let foundPage = false;
          for (const altPath of alternativePaths) {
            if (bundleCache.has(altPath)) {
              PageModule = await import(bundleCache.get(altPath));
              if (PageModule && PageModule.default) {
                foundPage = true;
                break;
              }
            }
          }

          if (!foundPage) {
            throw new Error(`페이지를 찾을 수 없습니다: ${pagePath}`);
          }
        }

        const Layout = LayoutModule.default;
        const Page = PageModule.default;

        if (!root) {
          const container = document.getElementById('root');
          root = ReactDOM.createRoot(container);
        }

        // Update browser history without triggering popstate
        if (window.location.pathname !== path) {
          history.replaceState({}, '', path);
        }

        root.render(React.createElement(Layout, null, React.createElement(Page)));

      } catch (e) {
        handleRuntimeError('페이지 렌더링 오류:', e);
      }
    }

    // Enhanced navigation handling
    window.addEventListener('click', (event) => {
      let target = event.target.closest('a');
      if (target) {
        const href = target.getAttribute('href');
        if (href && href.startsWith('/') && !href.startsWith('//')) {
          event.preventDefault();

          // Add loading state
          const loadingIndicator = document.createElement('div');
          loadingIndicator.id = 'nav-loading';
          loadingIndicator.style.cssText = \`
            position: fixed; top: 0; left: 0; right: 0; height: 3px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            z-index: 10000; animation: loading 0.5s ease-in-out;
          \`;
          document.body.appendChild(loadingIndicator);

          // Update history and render
          history.pushState({}, '', href);
          renderPage(href).finally(() => {
            const loading = document.getElementById('nav-loading');
            if (loading) loading.remove();
          });
        }
      }
    });

    window.addEventListener('popstate', (event) => {
      renderPage(window.location.pathname);
    });

    // Add loading animation CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes loading {
        0% { width: 0%; }
        50% { width: 70%; }
        100% { width: 100%; }
      }
    `;
    document.head.appendChild(style);

    // --- API Proxy: Override fetch ---
    const originalFetch = window.fetch;
    window.fetch = (url, options) => {
      return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(2);

        const messageListener = (event) => {
          if (event.data.type === 'API_RESPONSE' && event.data.requestId === requestId) {
            window.removeEventListener('message', messageListener);
            if (event.data.error) {
              reject(new Error(event.data.error));
            } else {
              // Reconstruct a Response object to mimic the real fetch API
              resolve(new Response(JSON.stringify(event.data.payload), {
                status: 200, // Assuming success for now
                headers: { 'Content-Type': 'application/json' }
              }));
            }
          }
        };
        window.addEventListener('message', messageListener);

        // Send the request to the parent proxy
        window.parent.postMessage({
          type: 'API_REQUEST',
          requestId,
          payload: { url: url.toString(), options }
        }, '*');
      });
    };
    // --- End API Proxy ---

    window.addEventListener('message', async (event) => {
      if (event.data.type === 'LOAD_BUNDLE') {
        const { outputFiles } = event.data.payload;

        // Revoke old blob URLs and clear cache
        bundleCache.forEach(url => URL.revokeObjectURL(url));
        bundleCache.clear();

        let cssContent = '';
        let assetFiles = new Map();

        for (const file of outputFiles) {
          const isCSS = file.path.endsWith('.css');
          const isAsset = file.path.includes('/assets/') || file.path.match(/\\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot)$/);

          if (isAsset) {
            // Handle asset files (images, fonts, etc.)
            const blob = new Blob([file.text], {
              type: file.path.endsWith('.svg') ? 'image/svg+xml' :
                   file.path.match(/\\.(png|jpe?g|gif|webp|ico)$/) ? 'image/*' :
                   file.path.match(/\\.(woff2?|ttf|eot)$/) ? 'font/*' : 'application/octet-stream'
            });
            assetFiles.set(file.path, URL.createObjectURL(blob));
          } else {
            // Handle JS/CSS files
            const blob = new Blob([file.text], {
              type: isCSS ? 'text/css' : 'application/javascript'
            });
            bundleCache.set(file.path, URL.createObjectURL(blob));

            if (isCSS) {
              cssContent += file.text;
            }
          }
        }

        // Update CSS
        const styleEl = document.getElementById('preview-styles');
        if (styleEl) styleEl.textContent = cssContent;

        // Store asset URLs globally for access
        window.assetUrls = assetFiles;

        // Initial render
        renderPage(window.location.pathname || '/');
      } else if (event.data.type === 'COMPILE_ERROR') {
        // Handle compile errors with enhanced display
        createErrorOverlay(event.data.payload);
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
  const [buildInfo, setBuildInfo] = useState<{ type: string; timestamp: number; duration?: number } | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    buildTime: number;
    bundleSize: number;
    fileCount: number;
  } | null>(null);

  // --- API Proxy Logic ---
  const apiAllowList = [
    // Allow all standard methods for any API endpoint under the current project
    // This is a broad rule for MVP functionality. In production, this should be more specific.
    { 
      path: `/api/projects/${projectId}/.*`, 
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] 
    },
  ];

  const isRequestAllowed = (url: string, method: string = 'GET') => {
    // Make sure the URL is relative to the origin
    const requestPath = url.startsWith('/') ? url : new URL(url).pathname;
    for (const rule of apiAllowList) {
      const pattern = new RegExp(`^${rule.path.replace(/:\w+/g, '[^/]+')}'use client';

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
      background: rgba(0,0,0,0.95); color: #ff5555;
      padding: 2rem; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      white-space: pre-wrap; z-index: 9999; overflow-y: auto;
      font-size: 14px; line-height: 1.5;
    }
    .error-header {
      font-size: 18px; font-weight: bold; margin-bottom: 1rem;
      color: #ff6b6b; border-bottom: 2px solid #ff6b6b;
      padding-bottom: 0.5rem;
    }
    .error-type {
      background: #ff6b6b; color: white; padding: 0.25rem 0.5rem;
      border-radius: 4px; font-size: 12px; margin-bottom: 1rem;
      display: inline-block;
    }
    .error-message {
      background: rgba(255, 107, 107, 0.1); padding: 1rem;
      border-left: 4px solid #ff6b6b; margin: 1rem 0;
      border-radius: 0 4px 4px 0;
    }
    .error-stack {
      background: rgba(0,0,0,0.3); padding: 1rem;
      border-radius: 4px; margin-top: 1rem;
      font-size: 12px; color: #ccc;
    }
    .error-actions {
      margin-top: 1rem; padding-top: 1rem;
      border-top: 1px solid #444;
    }
    .error-button {
      background: #ff6b6b; color: white; border: none;
      padding: 0.5rem 1rem; border-radius: 4px;
      cursor: pointer; margin-right: 0.5rem;
      font-size: 12px;
    }
    .error-button:hover { background: #ff5252; }
    .compile-error { border-left-color: #ff9800; }
    .compile-error .error-type { background: #ff9800; }
    .runtime-error { border-left-color: #f44336; }
    .runtime-error .error-type { background: #f44336; }
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

    const createErrorOverlay = (errorData) => {
      const errorDiv = document.createElement('div');
      errorDiv.className = \`error-overlay \${errorData.type}-error\`;

      const isCompileError = errorData.type === 'compile';
      const errorTypeText = isCompileError ? '컴파일 오류' : '런타임 오류';

      errorDiv.innerHTML = \`
        <div class="error-header">🚨 \${errorTypeText}</div>
        <div class="error-type">\${errorTypeText}</div>
        <div class="error-message">\${errorData.message}</div>
        \${errorData.stack ? \`<div class="error-stack">\${errorData.stack}</div>\` : ''}
        \${errorData.codeFrame ? \`<div class="error-stack">\${errorData.codeFrame}</div>\` : ''}
        <div class="error-actions">
          <button class="error-button" onclick="this.parentElement.parentElement.remove()">닫기</button>
          <button class="error-button" onclick="window.location.reload()">새로고침</button>
        </div>
      \`;

      document.body.appendChild(errorDiv);
    };

    const handleRuntimeError = (message, error) => {
      console.error(message, error);
      createErrorOverlay({
        type: 'runtime',
        message: \`\${message}\\n\${error?.message || ''}\`,
        stack: error?.stack || ''
      });
    };

    window.addEventListener('error', (event) => handleRuntimeError('런타임 오류:', event.error));
    window.addEventListener('unhandledrejection', (event) => handleRuntimeError('처리되지 않은 Promise 거부:', event.reason));

    // Page routing cache
    const pageCache = new Map();

    async function renderPage(path) {
      try {
        const errorOverlay = document.querySelector('.error-overlay');
        if (errorOverlay) errorOverlay.remove();

        // Normalize path
        const normalizedPath = path === '/' ? '' : path;
        const layoutPath = 'dist/src/app/layout.js';
        const pagePath = `dist/src/app${normalizedPath}/page.js`;

        // Check if we have cached modules
        let LayoutModule, PageModule;

        if (pageCache.has(layoutPath)) {
          LayoutModule = pageCache.get(layoutPath);
        } else {
          LayoutModule = await import(bundleCache.get(layoutPath));
          pageCache.set(layoutPath, LayoutModule);
        }

        if (pageCache.has(pagePath)) {
          PageModule = pageCache.get(pagePath);
        } else {
          PageModule = await import(bundleCache.get(pagePath));
          pageCache.set(pagePath, PageModule);
        }

        if (!LayoutModule || !LayoutModule.default) {
          throw new Error('layout.tsx에서 default export를 찾을 수 없습니다.');
        }
        if (!PageModule || !PageModule.default) {
          // Try to find alternative page files
          const alternativePaths = [
            `dist/src/app${normalizedPath}/index.js`,
            `dist/src/app${normalizedPath}/index.tsx`,
            `dist/src/app/page.js` // fallback to root page
          ];

          let foundPage = false;
          for (const altPath of alternativePaths) {
            if (bundleCache.has(altPath)) {
              PageModule = await import(bundleCache.get(altPath));
              if (PageModule && PageModule.default) {
                foundPage = true;
                break;
              }
            }
          }

          if (!foundPage) {
            throw new Error(`페이지를 찾을 수 없습니다: ${pagePath}`);
          }
        }

        const Layout = LayoutModule.default;
        const Page = PageModule.default;

        if (!root) {
          const container = document.getElementById('root');
          root = ReactDOM.createRoot(container);
        }

        // Update browser history without triggering popstate
        if (window.location.pathname !== path) {
          history.replaceState({}, '', path);
        }

        root.render(React.createElement(Layout, null, React.createElement(Page)));

      } catch (e) {
        handleRuntimeError('페이지 렌더링 오류:', e);
      }
    }

    // Enhanced navigation handling
    window.addEventListener('click', (event) => {
      let target = event.target.closest('a');
      if (target) {
        const href = target.getAttribute('href');
        if (href && href.startsWith('/') && !href.startsWith('//')) {
          event.preventDefault();

          // Add loading state
          const loadingIndicator = document.createElement('div');
          loadingIndicator.id = 'nav-loading';
          loadingIndicator.style.cssText = \`
            position: fixed; top: 0; left: 0; right: 0; height: 3px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            z-index: 10000; animation: loading 0.5s ease-in-out;
          \`;
          document.body.appendChild(loadingIndicator);

          // Update history and render
          history.pushState({}, '', href);
          renderPage(href).finally(() => {
            const loading = document.getElementById('nav-loading');
            if (loading) loading.remove();
          });
        }
      }
    });

    window.addEventListener('popstate', (event) => {
      renderPage(window.location.pathname);
    });

    // Add loading animation CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes loading {
        0% { width: 0%; }
        50% { width: 70%; }
        100% { width: 100%; }
      }
    `;
    document.head.appendChild(style);

    // --- API Proxy: Override fetch ---
    const originalFetch = window.fetch;
    window.fetch = (url, options) => {
      return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(2);

        const messageListener = (event) => {
          if (event.data.type === 'API_RESPONSE' && event.data.requestId === requestId) {
            window.removeEventListener('message', messageListener);
            if (event.data.error) {
              reject(new Error(event.data.error));
            } else {
              // Reconstruct a Response object to mimic the real fetch API
              resolve(new Response(JSON.stringify(event.data.payload), {
                status: 200, // Assuming success for now
                headers: { 'Content-Type': 'application/json' }
              }));
            }
          }
        };
        window.addEventListener('message', messageListener);

        // Send the request to the parent proxy
        window.parent.postMessage({
          type: 'API_REQUEST',
          requestId,
          payload: { url: url.toString(), options }
        }, '*');
      });
    };
    // --- End API Proxy ---

    window.addEventListener('message', async (event) => {
      if (event.data.type === 'LOAD_BUNDLE') {
        const { outputFiles } = event.data.payload;

        // Revoke old blob URLs and clear cache
        bundleCache.forEach(url => URL.revokeObjectURL(url));
        bundleCache.clear();

        let cssContent = '';
        let assetFiles = new Map();

        for (const file of outputFiles) {
          const isCSS = file.path.endsWith('.css');
          const isAsset = file.path.includes('/assets/') || file.path.match(/\\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot)$/);

          if (isAsset) {
            // Handle asset files (images, fonts, etc.)
            const blob = new Blob([file.text], {
              type: file.path.endsWith('.svg') ? 'image/svg+xml' :
                   file.path.match(/\\.(png|jpe?g|gif|webp|ico)$/) ? 'image/*' :
                   file.path.match(/\\.(woff2?|ttf|eot)$/) ? 'font/*' : 'application/octet-stream'
            });
            assetFiles.set(file.path, URL.createObjectURL(blob));
          } else {
            // Handle JS/CSS files
            const blob = new Blob([file.text], {
              type: isCSS ? 'text/css' : 'application/javascript'
            });
            bundleCache.set(file.path, URL.createObjectURL(blob));

            if (isCSS) {
              cssContent += file.text;
            }
          }
        }

        // Update CSS
        const styleEl = document.getElementById('preview-styles');
        if (styleEl) styleEl.textContent = cssContent;

        // Store asset URLs globally for access
        window.assetUrls = assetFiles;

        // Initial render
        renderPage(window.location.pathname || '/');
      } else if (event.data.type === 'COMPILE_ERROR') {
        // Handle compile errors with enhanced display
        createErrorOverlay(event.data.payload);
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
  const [buildInfo, setBuildInfo] = useState<{ type: string; timestamp: number; duration?: number } | null>(null);
  );
      if (pattern.test(requestPath) && rule.methods.includes(method.toUpperCase())) {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    const handleProxyMessage = async (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;

      if (event.data.type === 'API_REQUEST') {
        const { requestId, payload } = event.data;
        const { url, options } = payload;

        if (!isRequestAllowed(url, options?.method)) {
          iframeRef.current?.contentWindow?.postMessage({
            type: 'API_RESPONSE',
            requestId,
            error: `API request to ${url} blocked by security policy.`,
          }, '*');
          return;
        }

        try {
          // Use the actual authenticated fetch function from your API client if available
          // For now, we use the global fetch and assume the browser handles auth cookies
          const response = await fetch(url, options);
          
          let responseData;
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            responseData = await response.json();
          } else {
            responseData = await response.text();
          }

          if (!response.ok) {
            // Try to use error message from body, otherwise use status text
            const errorMessage = responseData?.message || response.statusText;
            throw new Error(errorMessage);
          }

          iframeRef.current?.contentWindow?.postMessage({
            type: 'API_RESPONSE',
            requestId,
            payload: responseData,
          }, '*');
        } catch (error: any) {
          iframeRef.current?.contentWindow?.postMessage({
            type: 'API_RESPONSE',
            requestId,
            error: error.message,
          }, '*');
        }
      }
    };
    
    window.addEventListener('message', handleProxyMessage);
    return () => window.removeEventListener('message', handleProxyMessage);
  }, [projectId]); // Add projectId to dependency array for apiAllowList
  // --- End API Proxy Logic ---

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

        // Calculate performance metrics
        const buildTime = payload.timestamp ? Date.now() - payload.timestamp : 0;
        const bundleSize = payload.outputFiles?.reduce((total: number, file: any) => total + (file.text?.length || 0), 0) || 0;
        const fileCount = payload.outputFiles?.length || 0;

        setBuildInfo({
          type: payload.buildType || 'unknown',
          timestamp: payload.timestamp || Date.now(),
          duration: buildTime
        });

        setPerformanceMetrics({
          buildTime,
          bundleSize,
          fileCount
        });

        iframeRef.current?.contentWindow?.postMessage({ type: 'LOAD_BUNDLE', payload }, '*');
      } else if (type === 'BUILD_ERROR') {
        console.error('빌드 오류:', payload);

        // Enhanced error display with diagnostics
        let errorMessage = payload.error?.message || '알 수 없는 빌드 오류';

        if (payload.diagnostics && payload.diagnostics.length > 0) {
          const firstDiagnostic = payload.diagnostics[0];
          errorMessage = firstDiagnostic.text;

          // Send compile error to iframe for better display
          iframeRef.current?.contentWindow?.postMessage({
            type: 'COMPILE_ERROR',
            payload: {
              type: 'compile',
              message: errorMessage,
              codeFrame: payload.codeFrame || '',
              diagnostics: payload.diagnostics
            }
          }, '*');
        } else {
          setBuildError(errorMessage);
        }
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
        const startTime = performance.now();

        workerRef.current.postMessage({
            type: 'BUILD',
            payload: {
              // entryPoint is now used as a fallback by the worker
              entryPoint: entryPath,
              vfsNodes,
              startTime
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
      {buildInfo && !buildError && (
        <div className="absolute top-2 right-2 bg-green-600 text-white px-3 py-1 rounded-md text-sm font-medium shadow-lg">
          <div className="flex items-center gap-2">
            <span>{buildInfo.type === 'initial' ? '초기 빌드' : '증분 빌드'} 완료</span>
            {performanceMetrics && (
              <div className="text-xs opacity-75">
                {performanceMetrics.buildTime}ms | {(performanceMetrics.bundleSize / 1024).toFixed(1)}KB | {performanceMetrics.fileCount}파일
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
