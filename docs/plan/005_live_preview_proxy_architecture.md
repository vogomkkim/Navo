# Plan: Live Preview Proxy Architecture

**Version:** 1.0
**Status:** Proposed

---

## 1. Executive Summary

This document outlines the technical implementation plan to evolve the Live Preview from a UI-only rendering environment into a fully interactive canvas capable of real backend communication. This will be achieved by re-architecting the `VfsPreviewRenderer` to act as a secure proxy for API requests originating from the sandboxed `iframe`. This transition is a mandatory step to remain competitive and deliver on Navo's core promise of turning ideas into functional applications.

## 2. Architectural Overview

The core of this architecture is a message-passing system that allows the sandboxed `iframe` to securely request data from the backend via its parent, the `VfsPreviewRenderer` component.

**Data Flow:**
`iframe` -> `postMessage({ type: 'API_REQUEST' })` -> `VfsPreviewRenderer` (Proxy) -> `fetch` -> Navo Backend API
`iframe` <- `postMessage({ type: 'API_RESPONSE' })` <- `VfsPreviewRenderer` (Proxy) <- `fetch` <- Navo Backend API

This ensures the `iframe` never has direct access to authentication tokens or the ability to make arbitrary network requests, while still enabling it to work with live data.

---

## 3. Frontend Implementation Details

### a. `VfsPreviewRenderer.tsx`: The Proxy Logic

The component will be responsible for listening for `API_REQUEST` messages and forwarding them.

```typescript
// Inside VfsPreviewRenderer.tsx useEffect
window.addEventListener('message', async (event) => {
  if (event.source !== iframeRef.current?.contentWindow) return;

  if (event.data.type === 'API_REQUEST') {
    const { requestId, payload } = event.data;
    const { url, options } = payload;

    // 1. Verify the request against the API Allow-List
    if (!isRequestAllowed(url, options.method)) {
      // Send an error response back to the iframe
      iframeRef.current?.contentWindow?.postMessage({
        type: 'API_RESPONSE',
        requestId,
        error: 'API request blocked by security policy.',
      }, '*');
      return;
    }

    // 2. Forward the request using the real fetchApi
    try {
      const responseData = await fetchApi(url, { ...options, token });
      // 3. Send success response back
      iframeRef.current?.contentWindow?.postMessage({
        type: 'API_RESPONSE',
        requestId,
        payload: responseData,
      }, '*');
    } catch (error) {
      // 4. Send error response back
      iframeRef.current?.contentWindow?.postMessage({
        type: 'API_RESPONSE',
        requestId,
        error: error.message,
      }, '*');
    }
  }
});
```

### b. `iframeHtml`: The `fetch` Override

To make this seamless for the user's code, we will override the global `fetch` function inside the `iframe`. This allows user code to use `fetch` naturally, without needing to know about the underlying `postMessage` mechanism.

```javascript
// Inside iframeHtml <script>
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
            status: 200,
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
      payload: { url, options }
    }, '*');
  });
};
```

---

## 4. Security Model: API Allow-List

This is the most critical piece for ensuring the proxy is not abused.

- **Definition:** A simple array of rules will be defined directly within `VfsPreviewRenderer.tsx` for the initial implementation.
- **Format:**
  ```typescript
  const apiAllowList = [
    { path: '/api/projects/:projectId/vfs', methods: ['GET'] },
    { path: '/api/users/:userId/posts', methods: ['GET', 'POST'] },
    // Future rules will be added here
  ];
  ```
- **Validation Logic:** The `isRequestAllowed` function will parse the incoming URL, match it against the path rules (including dynamic parameters like `:projectId`), and verify the HTTP method is permitted.

---

## 5. Phased Rollout Plan (MVP)

To manage complexity, the implementation will be rolled out in phases.

- **Phase 1 (Read-only):**
  - Implement the full proxy and `fetch` override mechanism.
  - The initial `apiAllowList` will **only** permit `GET` requests to safe, data-retrieval endpoints.
  - **Goal:** Allow users to build previews that can display real data from their project's database.

- **Phase 2 (Write Operations):**
  - Expand the `apiAllowList` to include `POST`, `PUT`, `PATCH`, and `DELETE` methods for specific, safe endpoints.
  - **Goal:** Enable previews that can create, update, and delete data (e.g., a fully functional to-do list).

- **Phase 3 (Authentication):**
  - Introduce rules for authentication-related endpoints (e.g., `/api/auth/user`).
  - **Goal:** Allow the preview to reflect a logged-in or logged-out state.

This phased approach ensures we can deliver value incrementally while carefully managing the security implications at each step.
