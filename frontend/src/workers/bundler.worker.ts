/// <reference lib="webworker" />
import * as esbuild from 'esbuild-wasm';
import type { VfsNodeDto } from '@/lib/apiClient';

let esbuildInitialized = false;
// Build context for incremental builds. Using `any` as the type from esbuild is complex.
let buildContext: any | null = null;
let currentVfs = new Map<string, string>();
let currentEntryPoint: string | null = null;
let lastVfsHash = '';
let buildCache = new Map<string, { hash: string; timestamp: number }>();


/**
 * Calculates a simple hash for VFS content to detect changes
 */
function calculateVfsHash(vfsNodes: VfsNodeDto[]): string {
  const content = vfsNodes
    .map(node => `${node.path}:${node.content || ''}:${node.mtime || 0}`)
    .sort()
    .join('|');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Checks if any files have changed since last build
 */
function hasVfsChanged(vfsNodes: VfsNodeDto[]): boolean {
  const currentHash = calculateVfsHash(vfsNodes);
  return currentHash !== lastVfsHash;
}

/**
 * Updates the build cache with file information
 */
function updateBuildCache(vfsNodes: VfsNodeDto[]) {
  const timestamp = Date.now();
  vfsNodes.forEach(node => {
    if (node.type === 'file') {
      buildCache.set(node.path, {
        hash: node.content ? calculateVfsHash([node]) : '',
        timestamp
      });
    }
  });
}

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
      const imageLoaderRegex = /\.(png|jpe?g|gif|svg|webp|ico)$/;
      const fontLoaderRegex = /\.(woff2?|ttf|eot)$/;
      let loader: esbuild.Loader = 'tsx';

      if (args.path.endsWith('.css')) {
        loader = 'css';
      } else if (args.path.endsWith('.scss') || args.path.endsWith('.sass')) {
        loader = 'css'; // esbuild will handle SCSS compilation
      } else if (imageLoaderRegex.test(args.path)) {
        loader = 'dataurl';
      } else if (fontLoaderRegex.test(args.path)) {
        loader = 'dataurl';
      } else if (args.path.endsWith('.json')) {
        loader = 'json';
      } else if (args.path.endsWith('.txt') || args.path.endsWith('.md')) {
        loader = 'text';
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

      // Check if VFS has changed before proceeding
      if (!hasVfsChanged(payload.vfsNodes)) {
        console.log('[Worker] No changes detected, skipping build');
        return;
      }

      // Update VFS with the latest content
      currentVfs = new Map(payload.vfsNodes.map((node: VfsNodeDto) => [node.path, node.content || '']));
      lastVfsHash = calculateVfsHash(payload.vfsNodes);
      updateBuildCache(payload.vfsNodes);

      try {
        // If entry point changes or context doesn't exist, create a new build context
        if (payload.entryPoint !== currentEntryPoint || !buildContext) {
          buildContext?.dispose?.(); // Dispose of the old context if it exists

          console.log(`[Worker] Creating new build context for entry points`);

          const allNodes = payload.vfsNodes as VfsNodeDto[];
          const entryPoints = allNodes
            .filter(node => node.type === 'file' && node.path.includes('/app') && node.path.endsWith('page.tsx'))
            .map(node => node.path);

          if (entryPoints.length === 0) {
            // Fallback to a single entry point if no pages are found
            entryPoints.push(payload.entryPoint);
          }

          buildContext = await esbuild.build({
            entryPoints,
            bundle: true,
            write: false,
            splitting: true, // Enable code splitting
            outdir: 'dist', // Needed for splitting, but doesn't write to disk
            plugins: [createVfsPlugin()],
            format: 'esm',
            target: 'es2020',
            jsx: 'transform',
            jsxFactory: 'React.createElement',
            jsxFragment: 'React.Fragment',
            incremental: true, // Enable incremental builds
            metafile: true, // Enable metafile for better caching
            // Enhanced asset handling
            assetNames: 'assets/[name]-[hash]',
            chunkNames: 'chunks/[name]-[hash]',
            // CSS handling
            cssCodeSplit: true,
            // External dependencies
            external: ['react', 'react-dom', 'react-dom/client'],
            // Source maps for debugging
            sourcemap: 'inline',
            // Minification (disabled for development)
            minify: false,
            // Tree shaking
            treeShaking: true,
            // Performance optimizations
            define: {
              'process.env.NODE_ENV': '"development"',
              'global': 'globalThis',
            },
            // Bundle size optimization
            mainFields: ['browser', 'module', 'main'],
            conditions: ['browser', 'development'],
            // Chunk size limits
            chunkSizeWarningLimit: 1000, // 1MB warning
            // Dead code elimination
            drop: ['console', 'debugger'],
            // Compression hints
            compress: false, // Disable compression for faster builds
          });

          console.log('[Worker] Initial build successful with output files:', buildContext.outputFiles.map(f => f.path));
          self.postMessage({
            type: 'BUILD_COMPLETE',
            payload: {
              outputFiles: buildContext.outputFiles,
              buildType: 'initial',
              timestamp: Date.now()
            }
          });

        } else {
          // Otherwise, just rebuild
          console.log('[Worker] Incremental rebuild...');
          const rebuildResult = await buildContext.rebuild();
          console.log('[Worker] Incremental rebuild successful with output files:', rebuildResult.outputFiles.map(f => f.path));
          self.postMessage({
            type: 'BUILD_COMPLETE',
            payload: {
              outputFiles: rebuildResult.outputFiles,
              buildType: 'incremental',
              timestamp: Date.now()
            }
          });
        }
      } catch (error) {
        console.error('[Worker] Build failed:', error);
        // On failure, reset the context so the next build is a full one
        buildContext?.dispose?.();
        buildContext = null;
        currentEntryPoint = null;

        // Enhanced error reporting with diagnostics
        const errorPayload = {
          error: error,
          diagnostics: [],
          codeFrame: ''
        };

        // Extract esbuild diagnostics if available
        if (error.errors && Array.isArray(error.errors)) {
          errorPayload.diagnostics = error.errors.map(err => ({
            text: err.text,
            location: err.location,
            notes: err.notes || []
          }));

          // Generate code frame for the first error
          if (error.errors[0] && error.errors[0].location) {
            const firstError = error.errors[0];
            const fileContent = currentVfs.get(firstError.location.file);
            if (fileContent) {
              const lines = fileContent.split('\n');
              const startLine = Math.max(0, firstError.location.line - 3);
              const endLine = Math.min(lines.length - 1, firstError.location.line + 2);

              let codeFrame = `파일: ${firstError.location.file}\\n`;
              codeFrame += `라인 ${firstError.location.line}, 컬럼 ${firstError.location.column}\\n\\n`;

              for (let i = startLine; i <= endLine; i++) {
                const lineNum = i + 1;
                const line = lines[i] || '';
                const marker = i === firstError.location.line - 1 ? '>>> ' : '    ';
                codeFrame += \`\${marker}\${lineNum.toString().padStart(3)}: \${line}\\n\`;

                if (i === firstError.location.line - 1) {
                  const spaces = ' '.repeat(firstError.location.column + 6);
                  codeFrame += \`\${spaces}^\\n\`;
                }
              }

              errorPayload.codeFrame = codeFrame;
            }
          }
        }

        self.postMessage({ type: 'BUILD_ERROR', payload: errorPayload });
      }
      break;
  }
};
