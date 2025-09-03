import type { ProjectRequest } from '@/core/types/project';

export interface ProjectPlan {
  id: string;
  name: string;
  description: string;
  features: string[];
  architecture: any;
  uiDesign?: any;
  codeStructure?: any;
  developmentGuide?: any;
  timeline: string;
  createdAt: string;
}

export async function generateProjectPlan(
  projectData: ProjectRequest,
  _context?: any
): Promise<ProjectPlan> {
  return {
    id: 'plan-' + Date.now(),
    name: projectData.name,
    description: projectData.description,
    features: projectData.features || [],
    architecture: {
      frontend: 'React',
      backend: 'Node.js',
      database: 'PostgreSQL',
    },
    // Optional sections can be filled by downstream agents if needed
    uiDesign: undefined,
    codeStructure: undefined,
    developmentGuide: undefined,
    timeline: '2-3 weeks',
    createdAt: new Date().toISOString(),
  };
}

export async function generateVirtualPreview(
  pageId: string,
  _path: string
): Promise<string> {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Virtual Preview</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .preview { border: 1px solid #ccc; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="preview">
        <h1>Virtual Preview for Page ${pageId}</h1>
        <p>This is a generated preview of the page.</p>
      </div>
    </body>
    </html>
  `;
}
