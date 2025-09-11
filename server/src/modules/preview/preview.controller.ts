import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { VfsRepositoryImpl } from '../projects/vfs.repository';

// Basic sanitizer to reduce XSS risk in preview output
function sanitizeHtml(unsafe: string): string {
  if (!unsafe) return '';
  // Remove script/style tags and on* event handlers, javascript: urls
  return unsafe
    .replace(/<\/(?:script|style)>/gi, '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/ on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/ on[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/ on[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:\s*/gi, '')
    .replace(/data:text\/html[^,]*,/gi, '');
}

// Helper function to get all nodes recursively
async function getAllNodesRecursively(vfsRepository: VfsRepositoryImpl, projectId: string, parentId: string): Promise<any[]> {
  const directChildren = await vfsRepository.listNodesByParentId(projectId, parentId);
  let allNodes = [...directChildren];

  for (const child of directChildren) {
    if (child.nodeType === 'DIRECTORY') {
      const subNodes = await getAllNodesRecursively(vfsRepository, projectId, child.id);
      allNodes = [...allNodes, ...subNodes];
    }
  }

  return allNodes;
}

// A very basic renderer to convert VFS nodes to an HTML page.
// In a real application, this would be a sophisticated engine (e.g., using a virtual DOM).
function renderToHtml(nodes: any[], targetNodeId?: string): string {
  // Reduce verbose logs to avoid leaking content
  console.log('=== renderToHtml ===', { totalNodes: nodes.length });

  const root = nodes.find((n) => n.name === '/');
  if (!root) {
    console.log('No root node found');
    return `<html><body><h1>Project root not found.</h1></body></html>`;
  }

  // Find all files recursively
  const allFiles = nodes.filter((n) => n.nodeType === 'FILE');

  let entryFile;

  // 특정 파일 ID가 주어졌을 때 해당 파일 찾기
  if (targetNodeId) {
    entryFile = allFiles.find((f) => f.id === targetNodeId);
  }

  // 특정 파일을 찾지 못했거나 ID가 주어지지 않았을 때 기본 로직 사용
  if (!entryFile) {
    // Look for entry points in order of preference
    entryFile =
      allFiles.find((f) => f.name.toLowerCase().includes('home.tsx')) ||
      allFiles.find((f) => f.name.toLowerCase().includes('home.jsx')) ||
      allFiles.find((f) => f.name.toLowerCase().includes('index.html')) ||
      allFiles.find((f) => f.name.toLowerCase().includes('app.tsx')) ||
      allFiles.find((f) => f.name.toLowerCase().includes('page.tsx')) ||
      allFiles.find((f) => f.name.toLowerCase().includes('main.tsx')) ||
      allFiles.find((f) => f.name.toLowerCase().includes('index.tsx')) ||
      allFiles[0];

    // noop
  }

  if (!entryFile) {
    console.log('No entry file found');
    return `<html><body><h1>No entry file found</h1><p>Create a file like 'Home.tsx', 'index.html' or 'App.tsx'.</p></body></html>`;
  }

  // Get file content and create a basic React-like preview
  const fileContent = entryFile.content || '';

  // If it's a React component, create a basic preview
  if (entryFile.name.toLowerCase().includes('.tsx') || entryFile.name.toLowerCase().includes('.jsx')) {
    const componentName = entryFile.name.replace(/\.(tsx|jsx)$/i, '');

    // Extract JSX content from the component - improved regex
    const jsxMatch = fileContent.match(/return\s*\(\s*<([\s\S]*?)>\s*\)/m) ||
                    fileContent.match(/return\s*<([\s\S]*?)>/m) ||
                    fileContent.match(/<div[^>]*>([\s\S]*?)<\/div>/m);

    let jsxContent = jsxMatch ? jsxMatch[1] : fileContent;

    // Clean up JSX for HTML display
    jsxContent = jsxContent
      .replace(/className/g, 'class')
      .replace(/style=\{\{([^}]+)\}\}/g, 'style="$1"')
      .replace(/\{([^}]+)\}/g, '$1') // Remove JSX expressions
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\/\/.*$/gm, ''); // Remove line comments

    // Create a simple preview with the component content
    const htmlContent = `
      <div style="padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <h2 style="color: #333; margin-bottom: 20px;">${componentName} Component Preview</h2>
        <div style="border: 1px solid #e1e5e9; border-radius: 8px; padding: 20px; background: #f8f9fa; min-height: 200px;">
          <div>${sanitizeHtml(jsxContent)}</div>
        </div>
        <details style="margin-top: 20px;">
          <summary style="cursor: pointer; color: #666;">Raw Component Code</summary>
          <pre style="background: #f1f3f4; padding: 10px; border-radius: 4px; overflow-x: auto; margin-top: 10px; font-size: 12px;">
            <code>${sanitizeHtml(fileContent)}</code>
          </pre>
        </details>
      </div>
    `;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Navo Preview - ${componentName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #fff; }
          * { box-sizing: border-box; }
          h1, h2, h3, h4, h5, h6 { margin: 0 0 10px 0; }
          p { margin: 0 0 10px 0; }
          button { padding: 8px 16px; border: 1px solid #ccc; border-radius: 4px; background: #fff; cursor: pointer; }
          button:hover { background: #f5f5f5; }
        </style>
      </head>
      <body>
        <div id="root">${htmlContent}</div>
      </body>
      </html>
    `;
  }

  // For HTML files, use content as-is
  const htmlContent = sanitizeHtml(fileContent || '<h1>Empty File</h1>');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Navo Preview</title>
      <style>
        body { font-family: sans-serif; margin: 0; }
      </style>
    </head>
    <body>
      <div id="root">${htmlContent}</div>
    </body>
    </html>
  `;
}

export function previewController(app: FastifyInstance) {
  const vfsRepository = new VfsRepositoryImpl(app);

  app.get('/api/preview/:projectId', async (request: any, reply: any) => {
    try {
      const params = request.params as any;
      const { projectId } = params;
      const query = request.query as any;
      const QuerySchema = z.object({ nodeId: z.string().optional() });
      const { nodeId } = QuerySchema.parse(query);

      // In a real app, we'd also need to verify user permissions to view the preview.
      // For now, we assume public access for simplicity.

      const rootNodes = await vfsRepository.listNodesByParentId(
        projectId,
        null,
      );
      if (!rootNodes || rootNodes.length === 0) {
        return reply.status(404).send('Project not found or has no root directory.');
      }
      const rootNode = rootNodes[0];

      // Get all nodes in a single query to avoid N+1
      const allNodes = (await vfsRepository.listNodesByProject(projectId)).filter(n => n.id !== rootNode.id);
      const nodes = [rootNode, ...allNodes];

      // Debug logging
      app.log.info(`Preview request for project ${projectId}, nodeId: ${nodeId || 'default'}, nodes=${nodes.length}`);

      const html = renderToHtml(nodes, nodeId);

      reply.type('text/html').send(html);
    } catch (error) {
      app.log.error(error, 'Error generating project preview');
      reply.status(500).send('Failed to generate preview.');
    }
  });
}
