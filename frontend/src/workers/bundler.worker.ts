/// <reference lib="webworker" />
import * as esbuild from 'esbuild-wasm';
import type { VfsNodeDto } from '@/lib/apiClient';

let esbuildInitialized = false;

/**
 * Initializes esbuild-wasm if it hasn't been already.
 */
async function initializeEsbuild() {
  if (esbuildInitialized) return;
  try {
    await esbuild.initialize({
      wasmURL: '/esbuild.wasm',
      worker: false,
    });
    esbuildInitialized = true;
    self.postMessage({ type: 'INIT_COMPLETE' });
    console.log('[Worker] esbuild initialized.');
  } catch (error) {
    console.error('[Worker] Failed to initialize esbuild:', error);
    self.postMessage({ type: 'INIT_ERROR', payload: { error } });
  }
}

/**
 * Creates an esbuild plugin to resolve and load files from a virtual file system.
 * @param vfs - A map of file paths to their content.
 * @returns An esbuild plugin object.
 */
const createVfsPlugin = (vfs: Map<string, string>): esbuild.Plugin => ({
  name: 'vfs-plugin',
  setup(build) {
    // Intercept import paths to resolve them against the VFS
    build.onResolve({ filter: /.*/ }, (args) => {
      // Handle the entry point
      if (args.kind === 'entry-point') {
        return { path: args.path, namespace: 'vfs' };
      }

      // Resolve relative imports (e.g., './Button') within the VFS
      if (args.path.startsWith('.') && args.importer) {
        const importerDir = args.importer.substring(0, args.importer.lastIndexOf('/'));
        const resolvedPath = new URL(args.path, `file://${importerDir}/`).pathname.substring(1);
        return { path: resolvedPath, namespace: 'vfs' };
      }
      
      // Mark external packages (like 'react') to be handled by the browser
      return { path: args.path, external: true };
    });

    // Load the content of a resolved path from the VFS
    build.onLoad({ filter: /.*/, namespace: 'vfs' }, (args) => {
      const content = vfs.get(args.path);
      if (content === undefined) {
        return { errors: [{ text: `File not found in VFS: ${args.path}` }] };
      }
      
      // Determine the correct loader based on the file extension
      const loader = args.path.endsWith('.css') ? 'css' : 'tsx';
      
      return { contents: content, loader };
    });
  },
});

/**
 * Bundles the code from the VFS using esbuild.
 * @param entryPoint - The starting file for the bundle (e.g., 'src/app/page.tsx').
 * @param vfsNodes - An array of file nodes from the API.
 */
async function bundleCode(entryPoint: string, vfsNodes: VfsNodeDto[]) {
  console.log(`[Worker] Starting build for entry point: ${entryPoint}`);
  const vfs = new Map(vfsNodes.map(node => [node.path, node.content || '']));

  try {
    const result = await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      write: false, // We want the output in memory, not written to a file
      plugins: [createVfsPlugin(vfs)],
      format: 'esm', // Output ES Module format
      target: 'es2020',
      jsx: 'transform', // Automatically transform JSX
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
    });

    console.log('[Worker] Build successful.');
    self.postMessage({ type: 'BUILD_COMPLETE', payload: { outputFiles: result.outputFiles } });
  } catch (error) {
    console.error('[Worker] Build failed:', error);
    self.postMessage({ type: 'BUILD_ERROR', payload: { error } });
  }
}


/**
 * Main message handler for the worker.
 */
self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'INIT':
      await initializeEsbuild();
      break;

    case 'BUILD':
      if (!esbuildInitialized) {
        self.postMessage({ type: 'BUILD_ERROR', payload: { error: 'esbuild not initialized' } });
        return;
      }
      if (!payload.entryPoint || !payload.vfsNodes) {
        self.postMessage({ type: 'BUILD_ERROR', payload: { error: 'Missing entryPoint or vfsNodes in payload' } });
        return;
      }
      await bundleCode(payload.entryPoint, payload.vfsNodes);
      break;
  }
};
