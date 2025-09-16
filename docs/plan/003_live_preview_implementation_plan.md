# Final Plan: Live Preview Implementation

**Version:** 2.0
**Status:** **Confirmed**

---

## Executive Summary
- ✅ **Architecture**: The proposed architecture (VFS tree from server → render on frontend) is sound.
- ⚠️ **Risks**: Arbitrary TSX execution poses risks (XSS, prototype pollution), along with challenges in import resolution, performance with large VFS, and SSR inconsistencies.
- 🛠️ **Solution**: We will implement a robust solution using a **sandboxed iframe** to isolate rendering, a **Web Worker** to handle transpilation/bundling, **allowlist-based dependency injection**, and a **module graph with path resolution**.

---

## 1. Backend API (`projects/vfs`)
**Goal**: To achieve minimal data transfer, fast synchronization, and secure access.

### Endpoint
- `GET /api/projects/:projectId/vfs?includeContent=true&paths=src/app/page.tsx,src/components/**&since=etagOrVersion`
- **(Optional)** `GET /api/projects/:projectId/vfs/stream` for SSE/WS change streaming.

### Response DTO (Proposed)
```json
{
  "projectId": "uuid",
  "version": "sha256-of-tree",
  "root": "src",
  "nodes": [
    { "path": "src/app/page.tsx", "type": "file", "lang": "tsx", "content": "...", "hash":"...", "mtime": 1720000000 },
    { "path": "src/components/Button.tsx", "type": "file", "lang": "tsx", "content": "..." },
    { "path": "public/logo.svg", "type": "file", "lang": "asset", "size": 12345 }
  ],
  "externals": {
    "react": "18.3.1",
    "react-dom": "18.3.1"
  }
}
```

### Server Checklist
- **RLS/ACL**: Verify owner/member permissions for the `projectId`.
- **Transfer Optimization**:
  - Use `If-None-Match` / `ETag: version`.
  - Support `includeContent=false` for structure-only requests, allowing for lazy loading of file content via `GET /vfs/file?path=...`.
  - Handle binary/large files using **signed URLs** or a separate CDN path.
- **Audit/Security**: Implement access logging, a per-request size cap (e.g., 5MB), and a file extension whitelist (`.ts`, `.tsx`, `.css`, `.json`, etc.).

---

## 2. Frontend Data Layer
- `useVfsTree(projectId, { includeContent, paths })`
  - Use `react-query` with `queryKey = ['vfs', projectId, version, filters]`.
  - Set the ETag in request headers to handle 304 responses.
- **(Optional)** `useVfsStream` to subscribe to SSE/WS for incremental updates.

---

## 3. Module Graph + Bundling Pipeline (Core)
**Goal**: To resolve TSX imports, create a bundle from a single entry point, and support dynamic hot updates.

### Engine Comparison
| Engine | Pros | Cons | Recommendation |
|---|---|---|---|
| **esbuild-wasm** | Fast, TS/JSX support, VFS resolver via plugins | Initial wasm load time | ✅ **Top Choice** |
| Babel Standalone | Flexible transformations | Requires manual implementation of import/bundling | Secondary |
| Sucrase | Extremely fast | No bundling, no TS type checking | Secondary |

**Recommendation**: `esbuild-wasm` + **custom VFS resolver plugin**.
- **Entry Point**: `src/app/page.tsx` (or user-selected file).
- **External Dependencies**: `react` and `react-dom` will be treated as **external** and injected into the preview iframe as `window.React` and `window.ReactDOM`.
- **CSS**: CSS will be extracted by esbuild and injected into the iframe as a `<style>` tag.

#### VFS Resolver (Overview)
```ts
const vfsPlugin = {
  name: 'vfs',
  setup(build) {
    build.onResolve({ filter: /.*/ }, args => {
      const resolved = resolvePath(args.path, args.importer); // Reflects TSConfig paths
      if (isExternal(resolved)) return { path: args.path, external: true };
      return { path: resolved, namespace: 'vfs' };
    });
    build.onLoad({ filter: /.*/, namespace: 'vfs' }, async (args) => {
      const file = vfs.get(args.path); // VFS map in memory
      return { contents: file.content, loader: guessLoader(file.path) }; // tsx, ts, json, css...
    });
  }
};
```

---

## 4. Execution Isolation: Web Worker + Sandbox Iframe
**Rule: No code execution on the main thread.**

### Flow
1.  **Worker**: Bundle the code using `esbuild-wasm` and create a `Blob URL`.
2.  **Iframe** (preferably from a different origin):
    - Use `<iframe sandbox="allow-scripts">` to block storage, same-origin, and top-navigation access.
    - Inject minimal HTML with a strict CSP (`script-src 'self' blob:`) via `srcdoc`.
    - A bootstrap script will inject `window.React` and `window.ReactDOM`.
    - Load the **bundle Blob URL** received from the Worker.
3.  **`postMessage` Channel**:
    - **Main ↔ Worker**: For build requests/results and error reporting.
    - **Main ↔ Iframe**: For mount/unmount commands, prop passing (if needed), and runtime error reporting.

### Iframe Bootstrap (Example)
```html
<!doctype html><meta charset="utf-t">
<div id="root"></div>
<script>
  window.React = /* pre-bundled React */;
  window.ReactDOM = /* pre-bundled ReactDOM */;

  addEventListener('message', async (e) => {
    if (e.data.type === 'LOAD_BUNDLE') {
      const mod = await import(e.data.blobUrl);
      const el = mod.default ? mod.default() : mod.render?.();
      window.ReactDOM.createRoot(document.getElementById('root')).render(el);
    }
  });

  window.addEventListener('error', ev => parent.postMessage({ type:'RUNTIME_ERROR', message: ev.message }, '*'));
</script>
```

---

## 5. `DynamicComponentRenderer.tsx` (Skeleton)
```tsx
export function DynamicComponentRenderer({ entryPath, vfs }: {entryPath:string; vfs:Vfs}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const workerRef = useRef<Worker>();

  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    workerRef.current.postMessage({ type: 'INIT' });
    return () => workerRef.current?.terminate();
  }, []);

  const build = useCallback(() => {
    workerRef.current?.postMessage({ type: 'BUILD', payload: { entryPath, vfs } });
  }, [entryPath, vfs]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data.type === 'BUILT') {
        iframeRef.current?.contentWindow?.postMessage({ type: 'LOAD_BUNDLE', blobUrl: e.data.payload.blobUrl }, '*');
      }
    };
    workerRef.current?.addEventListener('message', onMsg as any);
    build();
    return () => workerRef.current?.removeEventListener('message', onMsg as any);
  }, [build]);

  return <iframe ref={iframeRef} sandbox="allow-scripts" className="w-full h-full"
    srcDoc={`<!doctype html><div id="root"></div><script>/* inject React/DOM here */</script>`} />;
}
```

---

## 6. Error Handling, Logging, and Debugging
- **Compile Errors**: Display esbuild diagnostics with code frames.
- **Runtime Errors**: Report errors from the iframe to the parent via `postMessage` and display them as a toast/overlay.
- **(Optional) Type Checking**: Use `typescript-wasm` for background diagnostics.

---

## 7. Performance & UX
- **Incremental Builds**: Use esbuild's incremental build feature for changes.
- **Caching**: Use a `version` key for the VFS in-memory cache.
- **Lazy Loading**: Initially fetch only the entry point and its immediate dependencies.
- **Safeguards**: Warn users when the number of files or total project size exceeds a certain limit (e.g., 1k files / 5MB).

---

## 8. Security Checklist
- [x] No `eval` on the main thread.
- [x] Use a sandboxed iframe with a strong CSP.
- [x] Use a whitelist for external dependencies (fixed versions).
- [x] Block DOM, cookie, and storage access from the sandboxed code.
- [x] Validate `postMessage` origins and payloads.
- [x] Implement server-side permission checks and audit logs.

---

## 9. Milestones
- **M1. API Spec & DTO** (`/vfs` + ETag) <br> ✅ *Confirmed by Gemini on 2025-09-16: Backend API is implemented with ETag, `includeContent`, and `paths` filtering.*
- **M2. `useVfsTree` Hook** (ETag/304) <br> ✅ *Confirmed by Gemini on 2025-09-16: `useVfsTree` hook is implemented using `react-query` to fetch data from the backend API.*
- **M3. `esbuild-wasm` + VFS Plugin** <br> ✅ *Confirmed by Gemini on 2025-09-16: The bundler worker at `frontend/src/workers/bundler.worker.ts` is created, containing the core logic for the esbuild VFS plugin.*
- **M4. Worker Separation** <br> 🔄 *In Progress: The `DynamicComponentRenderer` now uses the bundler worker, establishing the separation.*
- **M5. Sandbox Iframe Rendering** <br> 🔄 *In Progress: The `DynamicComponentRenderer` renders the bundled output into a sandboxed iframe. The final React mounting logic is still needed.*
- **M6. Error Overlay & Incremental Builds**
- **M7. CSS/Image and Multi-page Support**

---

## Conclusion
The initial plan was directionally correct. By incorporating a **Worker + sandbox iframe**, a **module graph based on esbuild-wasm**, **ETag/streaming**, and **permissions/CSP**, we can build a secure, scalable, and production-ready Live Preview feature.