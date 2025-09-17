/// <reference lib="webworker" />
import * as esbuild from 'esbuild-wasm';
import type { VfsNodeDto } from '@/lib/apiClient';

let esbuildInitialized = false;
// Build context for incremental builds. Using `any` as the type from esbuild is complex.
let buildContext: any | null = null;
let currentVfs = new Map<string, string>();
let currentEntryPoint: string | null = null;


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
 * Creates an esbuild plugin to resolve and load files from the virtual file system.
 * This plugin reads from the worker's global `currentVfs` map.
 * @returns An esbuild plugin object.
 */
const createVfsPlugin = (): esbuild.Plugin => ({
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
      const content = currentVfs.get(args.path);
      if (content === undefined) {
        return { errors: [{ text: `File not found in VFS: ${args.path}` }] };
      }
      
      // Determine the correct loader based on the file extension
      const imageLoaderRegex = /\.(png|jpe?g|gif|svg|webp)$/;
      let loader: esbuild.Loader = 'tsx';
      if (args.path.endsWith('.css')) {
        loader = 'css';
      } else if (imageLoaderRegex.test(args.path)) {
        loader = 'dataurl';
      }
      
      return { contents: content, loader };
    });
  },
});

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

      // Update VFS with the latest content
      currentVfs = new Map(payload.vfsNodes.map((node: VfsNodeDto) => [node.path, node.content || '']));

      try {
        // If entry point changes or context doesn't exist, create a new build context
        if (payload.entryPoint !== currentEntryPoint || !buildContext) {
          buildContext?.dispose?.(); // Dispose of the old context if it exists

          console.log(`[Worker] Creating new build context for: ${payload.entryPoint}`);
          currentEntryPoint = payload.entryPoint;

          buildContext = await esbuild.build({
            entryPoints: [payload.entryPoint],
            bundle: true,
            write: false,
            plugins: [createVfsPlugin()],
            format: 'esm',
            target: 'es2020',
            jsx: 'transform',
            jsxFactory: 'React.createElement',
            jsxFragment: 'React.Fragment',
            incremental: true, // Enable incremental builds
          });
          
          console.log('[Worker] Initial build successful.');
          self.postMessage({ type: 'BUILD_COMPLETE', payload: { outputFiles: buildContext.outputFiles } });

        } else {
          // Otherwise, just rebuild
          console.log('[Worker] Rebuilding...');
          const rebuildResult = await buildContext.rebuild();
          console.log('[Worker] Rebuild successful.');
          self.postMessage({ type: 'BUILD_COMPLETE', payload: { outputFiles: rebuildResult.outputFiles } });
        }
      } catch (error) {
        console.error('[Worker] Build failed:', error);
        // On failure, reset the context so the next build is a full one
        buildContext?.dispose?.();
        buildContext = null;
        currentEntryPoint = null;
        self.postMessage({ type: 'BUILD_ERROR', payload: { error } });
      }
      break;
  }
};
