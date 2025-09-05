import { FastifyInstance } from 'fastify';
import { VfsRepositoryImpl } from '../projects/vfs.repository';

// A very basic renderer to convert VFS nodes to an HTML page.
// In a real application, this would be a sophisticated engine (e.g., using a virtual DOM).
function renderToHtml(nodes: any[]): string {
  const root = nodes.find((n) => n.name === '/');
  if (!root) {
    return `<html><body><h1>Project root not found.</h1></body></html>`;
  }
  const files = nodes.filter((n) => n.parentId === root.id);

  // For this MVP, we'll just find a file that looks like an entry point.
  const entryFile =
    files.find((f) => f.name.toLowerCase().includes('index.html')) ||
    files.find((f) => f.name.toLowerCase().includes('app.tsx')) ||
    files.find((f) => f.name.toLowerCase().includes('page.tsx')) ||
    files[0];

  if (!entryFile) {
    return `<html><body><h1>No entry file found</h1><p>Create a file like 'index.html' or 'App.tsx'.</p></body></html>`;
  }

  // Super simplified renderer: just takes the content of the entry file.
  // A real renderer would parse component structures, CSS, etc.
  const htmlContent = entryFile.content || '<h1>Empty File</h1>';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Navo Preview</title>
      <style>
        body { font-family: sans-serif; margin: 0; }
        /* Add basic styles to avoid unstyled content flash */
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

  app.get('/api/preview/:projectId', async (request, reply) => {
    try {
      const params = request.params as any;
      const { projectId } = params;

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

      const allNodes = await vfsRepository.listNodesByParentId(
        projectId,
        rootNode.id,
      );
      const nodes = [rootNode, ...allNodes];

      const html = renderToHtml(nodes);

      reply.type('text/html').send(html);
    } catch (error) {
      app.log.error(error, 'Error generating project preview');
      reply.status(500).send('Failed to generate preview.');
    }
  });
}
