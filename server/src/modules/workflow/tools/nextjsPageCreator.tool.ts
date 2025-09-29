import { ExecutionContext, Tool } from "../types";
import { ProjectsService } from "../../projects/projects.service";
import { z } from "zod";

// Next.js App Router 페이지를 생성하는 도구
export const createNextjsPageTool: Tool = {
  name: "create_nextjs_page",
  description:
    "Creates a Next.js page with proper App Router structure including page.tsx and layout.tsx files",
  inputSchema: z.object({
    route: z.string().describe("The route path (e.g., '/about', '/contact')"),
    pageTitle: z.string().describe("The title of the page"),
    pageContent: z.string().describe("The main content of the page"),
    layoutContent: z.string().optional().describe("Optional layout content"),
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the operation was successful"),
    route: z.string().describe("The created route path"),
    pagePath: z.string().describe("The path to the page.tsx file"),
    layoutPath: z
      .string()
      .optional()
      .describe("The path to the layout.tsx file if created"),
  }),
  async execute(
    context: ExecutionContext,
    input: {
      route: string;
      pageTitle: string;
      pageContent: string;
      layoutContent?: string;
    }
  ): Promise<{
    success: boolean;
    route: string;
    pagePath: string;
    layoutPath?: string;
  }> {
    const { projectId, userId } = context;
    if (!projectId || !userId) {
      throw new Error("Project ID and User ID are required");
    }

    const projectsService = new ProjectsService(context.app);

    // 라우트 정규화 (앞뒤 슬래시 제거)
    const normalizedRoute = input.route.replace(/^\/|\/$/g, "");
    const routePath = normalizedRoute || "page"; // 루트는 "page"로 처리

    console.log(
      `[create_nextjs_page] Creating page for route: ${input.route} (normalized: ${routePath})`
    );

    try {
      // 1. 페이지 디렉토리 생성
      const pageDirPath = `src/app/${routePath}`;
      await projectsService.findOrCreateVfsNodeByPath(
        projectId,
        userId,
        pageDirPath
      );

      // 2. page.tsx 파일 생성
      const pageContent = `import React from 'react';

export default function ${input.pageTitle.replace(/\s+/g, "")}Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          ${input.pageTitle}
        </h1>
        <div className="prose max-w-none">
          ${input.pageContent}
        </div>
      </div>
    </div>
  );
}`;

      const pageFilePath = `${pageDirPath}/page.tsx`;
      await projectsService.findOrCreateVfsNodeByPath(
        projectId,
        userId,
        pageFilePath
      );

      await projectsService.updateVfsNodeContent(
        (await projectsService.findVfsNodeByPath(projectId, pageFilePath))!.id,
        projectId,
        userId,
        pageContent
      );

      // 3. layout.tsx 파일 생성 (선택사항)
      let layoutPath: string | undefined;
      if (input.layoutContent) {
        const layoutFilePath = `${pageDirPath}/layout.tsx`;
        await projectsService.findOrCreateVfsNodeByPath(
          projectId,
          userId,
          layoutFilePath
        );

        await projectsService.updateVfsNodeContent(
          (await projectsService.findVfsNodeByPath(projectId, layoutFilePath))!
            .id,
          projectId,
          userId,
          input.layoutContent
        );
        layoutPath = layoutFilePath;
      }

      console.log(
        `[create_nextjs_page] Successfully created page at: ${pageFilePath}`
      );

      return {
        success: true,
        route: `/${normalizedRoute}`,
        pagePath: pageFilePath,
        layoutPath,
      };
    } catch (error: any) {
      console.error(
        `[create_nextjs_page] Failed to create page for route "${input.route}":`,
        error
      );
      throw error;
    }
  },
};

// 네비게이션 컴포넌트를 생성하는 도구
export const createNavigationTool: Tool = {
  name: "create_navigation",
  description: "Creates a navigation component with links to all pages",
  inputSchema: z.object({
    pages: z
      .array(
        z.object({
          route: z.string(),
          title: z.string(),
        })
      )
      .describe("Array of pages to include in navigation"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    navigationPath: z.string(),
  }),
  async execute(
    context: ExecutionContext,
    input: { pages: Array<{ route: string; title: string }> }
  ): Promise<{ success: boolean; navigationPath: string }> {
    const { projectId, userId } = context;
    if (!projectId || !userId) {
      throw new Error("Project ID and User ID are required");
    }

    const projectsService = new ProjectsService(context.app);

    const navigationContent = `import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Home
            </Link>
            ${input.pages
              .map(
                (page) => `
            <Link
              href="${page.route}"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ${page.title}
            </Link>`
              )
              .join("")}
          </div>
        </div>
      </div>
    </nav>
  );
}`;

    try {
      const navigationPath = "src/components/Navigation.tsx";
      await projectsService.findOrCreateVfsNodeByPath(
        projectId,
        userId,
        navigationPath
      );

      await projectsService.updateVfsNodeContent(
        (await projectsService.findVfsNodeByPath(projectId, navigationPath))!
          .id,
        projectId,
        userId,
        navigationContent
      );

      console.log(
        `[create_navigation] Successfully created navigation at: ${navigationPath}`
      );

      return {
        success: true,
        navigationPath,
      };
    } catch (error: any) {
      console.error(`[create_navigation] Failed to create navigation:`, error);
      throw error;
    }
  },
};
