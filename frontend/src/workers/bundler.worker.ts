import * as esbuild from 'esbuild-wasm';
import { VfsNodeDto } from '@/lib/apiClient';

/**
 * An esbuild plugin to resolve imports against our in-memory virtual file system.
 * @param vfs A map of file paths to VfsNodeDto objects.
 * @param entryPath The main entry point for the build.
 */
const vfsPlugin = (vfs: Map<string, VfsNodeDto>, entryPath: string) => {
  return {
    name: 'vfs-plugin',
    setup(build: esbuild.PluginBuild) {
      // 1. Resolve the entry point directly.
      build.onResolve({ filter: new RegExp(`^${entryPath}$`) }, (args) => {
        return { path: args.path, namespace: 'vfs' };
      });

      // 2. Resolve relative paths (e.g., './Button' or '../lib/utils').
      build.onResolve({ filter: /^.\.?\// }, (args) => {
        const importerDir = args.importer.substring(0, args.importer.lastIndexOf('/') + 1);
        let resolvedPath = new URL(args.path, `file:///${importerDir}`).pathname.substring(1);

        // Try resolving with common extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
        const candidates = [
          resolvedPath,
          ...extensions.map(ext => `${resolvedPath}${ext}`),
          ...extensions.map(ext => `${resolvedPath}/index${ext}`),
        ];

        for (const candidate of candidates) {
          if (vfs.has(candidate)) {
            return { path: candidate, namespace: 'vfs' };
          }
        }

        // If it's a directory, look for an index file.
        const indexCandidate = `${resolvedPath}/index`;
        for (const ext of extensions) {
            if (vfs.has(`${indexCandidate}${ext}`)) {
                return { path: `${indexCandidate}${ext}`, namespace: 'vfs' };
            }
        }

        throw new Error(`Could not resolve path: ${args.path} from ${args.importer}`);
      });

      // 3. Load files from our VFS map.
      build.onLoad({ filter: /.*/, namespace: 'vfs' }, (args) => {
        const file = vfs.get(args.path);
        if (!file || file.type !== 'file') {
          throw new Error(`File not found in VFS: ${args.path}`);
        }

        const ext = args.path.split('.').pop()?.toLowerCase();
        let loader: esbuild.Loader = 'text';
        if (ext === 'ts') loader = 'ts';
        if (ext === 'tsx') loader = 'tsx';
        if (ext === 'js') loader = 'js';
        if (ext === 'jsx') loader = 'jsx';
        if (ext === 'json') loader = 'json';
        if (ext === 'css') loader = 'css';

        return {
          contents: file.content || '',
          loader,
        };
      });
    },
  };
};


let esbuildInitialized = false;

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === 'INIT') {
    if (!esbuildInitialized) {
      try {
        await esbuild.initialize({
          wasmURL: '/esbuild.wasm',
          worker: false,
        });
        esbuildInitialized = true;
        self.postMessage({ type: 'INIT_SUCCESS' });
      } catch (error) {
        self.postMessage({ type: 'INIT_ERROR', payload: (error as Error).message });
      }
    } else {
      self.postMessage({ type: 'INIT_SUCCESS' }); // Already initialized
    }
    return;
  }

  if (type === 'BUILD') {
    if (!esbuildInitialized) {
      self.postMessage({ type: 'BUILD_ERROR', payload: 'esbuild is not initialized.' });
      return;
    }

    const { entryPath, vfsNodes } = payload as { entryPath: string, vfsNodes: VfsNodeDto[] };
    const vfsMap = new Map<string, VfsNodeDto>(vfsNodes.map(node => [node.path, node]));

    try {
      const result = await esbuild.build({
        entryPoints: [entryPath],
        bundle: true,
        write: false,
        plugins: [vfsPlugin(vfsMap, entryPath)],
        define: {
          'process.env.NODE_ENV': '"production"',
          global: 'window',
        },
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment',
        external: ['react', 'react-dom'],
        outdir: '/out', // virtual output directory
      });

      const jsFile = result.outputFiles.find((f) => f.path.endsWith('.js'));
      const cssFile = result.outputFiles.find((f) => f.path.endsWith('.css'));

      self.postMessage({
        type: 'BUILD_COMPLETE',
        payload: {
          js: jsFile?.text || '',
          css: cssFile?.text || '',
        },
      });
    } catch (error) {
      self.postMessage({ type: 'BUILD_ERROR', payload: (error as Error).message });
    }
  }
};