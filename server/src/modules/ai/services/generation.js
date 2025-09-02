export async function generateProjectContent(projectData) {
  // 프로젝트 콘텐츠 생성 로직
  return {
    files: [
      {
        path: 'index.html',
        content: '<!DOCTYPE html><html><head><title>Generated Project</title></head><body><h1>Hello World</h1></body></html>'
      },
      {
        path: 'styles.css',
        content: 'body { font-family: Arial, sans-serif; margin: 20px; }'
      }
    ],
    metadata: {
      projectName: projectData.name,
      generatedAt: new Date().toISOString()
    }
  };
}
