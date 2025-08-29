import { BaseAgent } from '../core/masterDeveloper.js';
import { ProjectDatabaseManagerAgent } from './projectDatabaseManagerAgent.js';

// Helper function to find a file in the virtual structure
const findFileInStructure = (structure: any, filePath: string): any | null => {
  const pathParts = filePath.split('/').filter(p => p);
  let currentNode = structure;

  for (const part of pathParts) {
    if (currentNode.type !== 'folder' || !currentNode.children) {
      return null;
    }
    const foundNode = currentNode.children.find((node: any) => node.name === part);
    if (!foundNode) {
      return null;
    }
    currentNode = foundNode;
  }

  return currentNode.type === 'file' ? currentNode : null;
};

export class VirtualPreviewGeneratorAgent extends BaseAgent {
  private dbManager: ProjectDatabaseManagerAgent;

  constructor() {
    super('VirtualPreviewGeneratorAgent', 5);
    this.dbManager = new ProjectDatabaseManagerAgent();
  }

  canHandle(request: any): boolean {
    return request.type === 'generate_preview';
  }

  async execute(request: { draftId: string; filePath: string }): Promise<string> {
    this.logger.info(`🎨 Generating virtual preview for ${request.filePath} in draft ${request.draftId}`);

    const draft = await this.dbManager.getDraft(request.draftId);
    if (!draft || !draft.data.project?.file_structure) {
      throw new Error('Could not retrieve project structure for draft.');
    }

    const projectStructure = draft.data.project.file_structure;
    const requestedFile = findFileInStructure(projectStructure, request.filePath);

    if (!requestedFile) {
      return `<h1>File not found: ${request.filePath}</h1>`;
    }

    // For now, just show the code for JS/JSX/CSS files
    if (request.filePath.endsWith('.js') || request.filePath.endsWith('.jsx') || request.filePath.endsWith('.css')) {
      return `<pre><code>${escape(requestedFile.content)}</code></pre>`;
    }

    // If the request is for the main HTML file, generate a host page for the React app
    if (request.filePath.endsWith('index.html') || request.filePath === '/') {
      const previewHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Navo Project Preview</title>
    <style>
        body { margin: 0; overflow: hidden; }
        #root { width: 100vw; height: 100vh; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script>
        // Pass the draftId to the frontend application
        window.NAVO_PREVIEW_DRAFT_ID = "${request.draftId}";
        // Load the main React application bundle
        // Assuming the React app is served from the root path of the preview server
        const script = document.createElement('script');
        script.src = '/static/js/bundle.js'; // Adjust this path if your React app bundle is elsewhere
        script.onload = () => {
            // Once the React app is loaded, it should pick up window.NAVO_PREVIEW_DRAFT_ID
            // and render the project using DynamicComponentRenderer
            console.log('Navo React app bundle loaded.');
        };
        document.body.appendChild(script);
    </script>
</body>
</html>
`;
      return previewHtml;
    }

    // For other files, just return their content (e.g., images, other assets)
    // This part might need more sophisticated MIME type handling in a real scenario
    return requestedFile.content;

    return requestedFile.content;
  }
}

// Basic escape function for HTML
function escape(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
