export async function renderProjectToHTML(projectData: any) {
  const { project, pages, components } = projectData;

  let html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .header { background: #f8f9fa; padding: 1rem; text-align: center; }
        .content { padding: 2rem; max-width: 1200px; margin: 0 auto; }
        .footer { background: #333; color: white; padding: 1rem; text-align: center; }
        .component { margin: 1rem 0; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; }
    </style>
</head>
<body>
`;

  for (const page of pages) {
    html += `<div class="page" data-path="${page.path}">`;
    html += `<h1>${page.name}</h1>`;

    if (page.layoutJson && page.layoutJson.components) {
      for (const comp of page.layoutJson.components) {
        const componentDef = components.find((c: any) => c.name === comp.type);
        if (componentDef) {
          html += `<div class="component ${comp.type}">`;
          let componentHtml = componentDef.renderTemplate;
          if (comp.props) {
            for (const [key, value] of Object.entries(comp.props)) {
              componentHtml = componentHtml.replace(
                `{{${key}}}`,
                String(value)
              );
            }
          }
          html += componentHtml;
          html += `</div>`;
        }
      }
    }

    html += `</div>`;
  }

  html += `
</body>
</html>`;

  return html;
}

export async function renderPageToHTML(
  projectData: any,
  pagePath: string,
  baseHref?: string
) {
  const { project, pages } = projectData;
  const componentDefinitions = projectData.componentDefinitions || projectData.components || [];

  const normalizedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
  const page = pages.find((p: any) => p.path === normalizedPath);

  if (!page) {
    return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>페이지를 찾을 수 없습니다</title></head><body><h1>404 Not Found</h1><p>경로: ${normalizedPath}</p></body></html>`;
  }

  let html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name} - ${page.name}</title>
    ${baseHref ? `<base href="${baseHref}">` : ''}
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .header { background: #f8f9fa; padding: 1rem; text-align: center; }
        .content { padding: 2rem; max-width: 1200px; margin: 0 auto; }
        .footer { background: #333; color: white; padding: 1rem; text-align: center; }
        .component { margin: 1rem 0; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; }
        a { color: #2563eb; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
  <header class="header"><strong>${project.name}</strong></header>
  <main class="content">
    <h1>${page.name}</h1>
`;

  if (page.layoutJson && page.layoutJson.components) {
    for (const comp of page.layoutJson.components) {
      const def = componentDefinitions.find((c: any) => c.name === comp.type || c.displayName === comp.type);
      html += `<div class="component ${comp.type}">`;
      if (def && def.renderTemplate) {
        let componentHtml = def.renderTemplate as string;
        if (comp.props) {
          for (const [key, value] of Object.entries(comp.props)) {
            componentHtml = componentHtml.replace(`{{${key}}}`, String(value));
          }
        }
        html += componentHtml;
      } else {
        html += `<div>${comp.type}</div>`;
      }
      html += `</div>`;
    }
  }

  html += `
  </main>
  <footer class="footer">프리뷰 · ${new Date().toLocaleString('ko-KR')}</footer>
</body>
</html>`;

  return html;
}
