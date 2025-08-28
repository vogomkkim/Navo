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

    // For index.html, try to assemble a self-contained preview
    if (request.filePath.endsWith('index.html')) {
      let htmlContent = requestedFile.content;

      // Inject CSS
      const cssLinks = [...htmlContent.matchAll(/<link.*?href="(.*?\.css)".*?>/g)];
      for (const match of cssLinks) {
        const cssPath = match[1];
        const cssFile = findFileInStructure(projectStructure, cssPath);
        if (cssFile) {
          htmlContent = htmlContent.replace(match[0], `<style>${cssFile.content}</style>`);
        }
      }

      // Inject JS
      const scriptSrcs = [...htmlContent.matchAll(/<script.*?src="(.*?\.js)".*?>/g)];
      for (const match of scriptSrcs) {
        const jsPath = match[1];
        const jsFile = findFileInStructure(projectStructure, jsPath);
        if (jsFile) {
          // NOTE: This is a simplified approach. It doesn't handle module imports.
          // For a true preview, a bundler like esbuild-wasm would be needed.
          htmlContent = htmlContent.replace(match[0], `<script>${jsFile.content}</script>`);
        }
      }
      
      return htmlContent;
    }

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
