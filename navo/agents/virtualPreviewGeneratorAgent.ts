import { BaseAgent } from "../core/masterDeveloper.js";
import { ProjectDatabaseManagerAgent } from "./projectDatabaseManagerAgent.js";

// Helper function to find a file in the virtual structure
const findFileInStructure = (structure: any, filePath: string): any | null => {
  const pathParts = filePath.split("/").filter((p) => p);
  let currentNode = structure;

  for (const part of pathParts) {
    if (currentNode.type !== "folder" || !currentNode.children) {
      return null;
    }
    const foundNode = currentNode.children.find(
      (node: any) => node.name === part
    );
    if (!foundNode) {
      return null;
    }
    currentNode = foundNode;
  }

  return currentNode.type === "file" ? currentNode : null;
};

export class VirtualPreviewGeneratorAgent extends BaseAgent {
  private dbManager: ProjectDatabaseManagerAgent;

  constructor() {
    super("VirtualPreviewGeneratorAgent", 5);
    this.dbManager = new ProjectDatabaseManagerAgent();
  }

  canHandle(request: any): boolean {
    return request.type === "generate_preview";
  }

  async execute(request: {
    pageId: string;
    filePath: string;
  }): Promise<string> {
    this.logger.info(
      `🎨 Generating virtual preview for ${request.filePath} in page ${request.pageId}`
    );

    // TODO: Implement page-based preview generation
    // For now, return a simple preview page
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
    <div id="root">
        <h1>Project Preview</h1>
        <p>Page ID: ${request.pageId}</p>
        <p>File Path: ${request.filePath}</p>
        <p>This is a placeholder preview. Implement actual page rendering here.</p>
    </div>
</body>
</html>
`;
    return previewHtml;
  }
}

// Basic escape function for HTML
function escape(html: string): string {
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
