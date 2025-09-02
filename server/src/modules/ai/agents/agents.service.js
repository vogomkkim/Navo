export async function generateProjectPlan(projectData, context) {
  // 프로젝트 계획 생성 로직
  return {
    id: 'plan-' + Date.now(),
    name: projectData.name,
    description: projectData.description,
    features: projectData.features || [],
    architecture: {
      frontend: 'React',
      backend: 'Node.js',
      database: 'PostgreSQL'
    },
    timeline: '2-3 weeks',
    createdAt: new Date().toISOString()
  };
}

export async function generateVirtualPreview(pageId, context) {
  // 가상 프리뷰 생성 로직
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
