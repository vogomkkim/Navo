import { db } from "../db/db.js";
import {
  projects,
  pages,
  componentDefinitions,
  components,
} from "../db/schema.js";
import { eq } from "drizzle-orm";
import { BaseAgent } from "../core/masterDeveloper.js";
import { randomUUID as uuidv4 } from "node:crypto";

export class ProjectDatabaseManagerAgent extends BaseAgent {
  constructor() {
    super("ProjectDatabaseManagerAgent", 4); // Lower priority, as it's a utility agent
  }

  canHandle(request: any): boolean {
    // This agent is not directly triggered by user requests, but by other agents.
    return false;
  }

  async execute(request: any, context: any): Promise<any> {
    // This agent is not meant to be executed directly in the main loop.
    // It provides utility methods for other agents.
    throw new Error("ProjectDatabaseManagerAgent cannot be executed directly.");
  }

  /**
   * Creates a new project in the database.
   * @param projectData The project data to create.
   * @returns The newly created project object.
   */
  async createProject(projectData: {
    name: string;
    description: string;
    ownerId: string;
    type: string;
  }): Promise<any> {
    try {
      this.logger.info(`🏗️ Creating new project: ${projectData.name}`);

      const newProject = {
        id: uuidv4(),
        name: projectData.name,
        description: projectData.description,
        ownerId: projectData.ownerId,
        type: projectData.type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await db.insert(projects).values(newProject).returning();

      this.logger.info(
        `✅ Project created successfully with ID: ${result[0].id}`
      );
      return result[0];
    } catch (error) {
      this.logger.error("❌ Failed to create project in database", {
        error: error instanceof Error ? error.message : String(error),
        projectData,
      });
      throw new Error(
        `Project creation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Creates pages directly in the database from AI architecture design.
   * @param projectId The ID of the project these pages belong to.
   * @param projectArchitecture The AI-generated project architecture.
   * @returns Array of created page objects.
   */
  async createPagesFromArchitecture(
    projectId: string,
    projectArchitecture: any
  ): Promise<any[]> {
    try {
      this.logger.info(
        `📄 Creating pages from AI architecture for project ${projectId}`
      );

      if (
        !projectArchitecture.pages ||
        !Array.isArray(projectArchitecture.pages)
      ) {
        this.logger.warn(
          "⚠️ No pages found in architecture, creating default page"
        );
        projectArchitecture.pages = [
          {
            name: "Home",
            path: "/",
            description: "메인 페이지",
            type: "page",
          },
        ];
      }

      const createdPages = [];

      for (const pageData of projectArchitecture.pages) {
        const newPage = {
          id: uuidv4(),
          projectId,
          name: pageData.name,
          path: pageData.path || `/${pageData.name.toLowerCase()}`,
          description: pageData.description || `${pageData.name} 페이지`,
          type: pageData.type || "page",
          layoutJson: {
            components: pageData.components || [],
            layout: pageData.layout || "default",
            metadata: {
              createdBy: "AI Agent",
              createdAt: new Date().toISOString(),
              version: "1.0.0",
            },
          },
          isPublished: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const result = await db.insert(pages).values(newPage).returning();
        createdPages.push(result[0]);

        this.logger.info(
          `✅ Page "${pageData.name}" created with ID: ${result[0].id}`
        );
      }

      this.logger.info(`🎉 Successfully created ${createdPages.length} pages`);
      return createdPages;
    } catch (error) {
      this.logger.error("❌ Failed to create pages from architecture", {
        error: error instanceof Error ? error.message : String(error),
        projectId,
      });
      throw new Error(
        `Page creation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Creates component definitions directly in the database from AI architecture design.
   * @param projectId The ID of the project these components belong to.
   * @param projectArchitecture The AI-generated project architecture.
   * @returns Array of created component definition objects.
   */
  async createComponentDefinitionsFromArchitecture(
    projectId: string,
    projectArchitecture: any
  ): Promise<any[]> {
    try {
      this.logger.info(
        `🧩 Creating component definitions from AI architecture for project ${projectId}`
      );

      if (
        !projectArchitecture.components ||
        !Array.isArray(projectArchitecture.components)
      ) {
        this.logger.warn(
          "⚠️ No components found in architecture, creating default components"
        );
        projectArchitecture.components = [
          {
            name: "Header",
            display_name: "페이지 헤더",
            type: "layout",
            description: "페이지 헤더 컴포넌트",
            props_schema: ["title", "navigation"],
            render_template:
              "<header class='header'><h1>{title}</h1><nav>{navigation}</nav></header>",
            css_styles: ".header { padding: 1rem; background: #f8f9fa; }",
          },
          {
            name: "Button",
            display_name: "버튼",
            type: "ui",
            description: "기본 버튼 컴포넌트",
            props_schema: ["text", "onClick", "variant"],
            render_template:
              "<button class='btn btn-{variant}' onclick='{onClick}'>{text}</button>",
            css_styles:
              ".btn { padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }",
          },
        ];
      }

      const createdComponents = [];

      for (const compData of projectArchitecture.components) {
        const newComponent = {
          projectId,
          name: compData.name,
          displayName: compData.display_name || compData.name,
          description: compData.description || `${compData.name} 컴포넌트`,
          category: compData.type || "ui",
          propsSchema: compData.props_schema || {},
          renderTemplate:
            compData.render_template ||
            `<div class="${compData.name.toLowerCase()}">{content}</div>`,
          cssStyles: compData.css_styles || "",
          isActive: true,
        };

        const result = await db
          .insert(componentDefinitions)
          .values(newComponent)
          .returning();
        createdComponents.push(result[0]);

        this.logger.info(
          `✅ Component "${compData.name}" created with ID: ${result[0].id}`
        );
      }

      this.logger.info(
        `🎉 Successfully created ${createdComponents.length} component definitions`
      );
      return createdComponents;
    } catch (error) {
      this.logger.error(
        "❌ Failed to create component definitions from architecture",
        {
          error: error instanceof Error ? error.message : String(error),
          projectId,
        }
      );
      throw new Error(
        `Component definition creation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Creates components directly in the database from AI architecture design.
   * @param projectId The ID of the project these components belong to.
   * @param pageId The ID of the page these components belong to.
   * @param projectArchitecture The AI-generated project architecture.
   * @returns Array of created component objects.
   */
  async createComponentsFromArchitecture(
    projectId: string,
    pageId: string,
    projectArchitecture: any
  ): Promise<any[]> {
    try {
      this.logger.info(
        `🔧 Creating components from AI architecture for page ${pageId} in project ${projectId}`
      );

      // 프로젝트의 컴포넌트 정의들을 가져오기
      const projectComponentDefs = await db
        .select()
        .from(componentDefinitions)
        .where(eq(componentDefinitions.projectId, projectId));

      if (projectComponentDefs.length === 0) {
        this.logger.warn(
          "⚠️ No component definitions found for project, skipping component creation"
        );
        return [];
      }

      // AI 아키텍처에서 페이지별 컴포넌트 정보 가져오기
      const pageComponents = [];

      // 현재 페이지 정보 찾기 (ID 또는 path로 매칭)
      const currentPage =
        projectArchitecture.pages?.find((page: any) => page.id === pageId) ||
        projectArchitecture.pages?.find((page: any) => page.path === "/") ||
        projectArchitecture.pages?.[0];

      this.logger.info(
        `📄 Processing page: ${currentPage?.name || "Unknown"} (${currentPage?.path})`
      );

      if (
        currentPage &&
        currentPage.components &&
        Array.isArray(currentPage.components)
      ) {
        // 페이지에 정의된 컴포넌트들 사용
        for (let i = 0; i < currentPage.components.length; i++) {
          const pageComp = currentPage.components[i];
          const matchingDef = projectComponentDefs.find(
            (def) => def.name === pageComp.type
          );

          if (matchingDef) {
            pageComponents.push({
              name: pageComp.type,
              componentDefinitionId: matchingDef.id,
              props: pageComp.props || {},
              order: i + 1,
            });

            this.logger.info(
              `✅ Found matching component: ${pageComp.type} -> ${matchingDef.displayName}`
            );
          } else {
            this.logger.warn(
              `⚠️ No matching component definition found for: ${pageComp.type}`
            );
          }
        }
      } else {
        this.logger.info(
          `📝 No components defined in AI architecture for page: ${currentPage?.name}`
        );
      }

      // 컴포넌트가 없으면 기본 컴포넌트 하나 생성 (페이지별 맞춤 props 적용)
      if (pageComponents.length === 0) {
        const pageSpecificProps = this.generatePageSpecificProps(
          currentPage,
          projectComponentDefs[0]
        );

        pageComponents.push({
          name:
            projectComponentDefs[0].displayName || projectComponentDefs[0].name,
          componentDefinitionId: projectComponentDefs[0].id,
          props: pageSpecificProps,
          order: 1,
        });

        this.logger.info(
          `🎯 Created component with page-specific props: ${projectComponentDefs[0].displayName}`
        );
      }

      const createdComponents = [];

      for (const compData of pageComponents) {
        const newComponent = {
          pageId,
          componentDefinitionId: compData.componentDefinitionId,
          props: compData.props,
          orderIndex: compData.order,
        };

        const result = await db
          .insert(components)
          .values(newComponent)
          .returning();
        createdComponents.push(result[0]);

        this.logger.info(
          `✅ Component "${compData.name}" created with ID: ${result[0].id}`
        );
      }

      this.logger.info(
        `🎉 Successfully created ${createdComponents.length} components`
      );
      return createdComponents;
    } catch (error) {
      this.logger.error("❌ Failed to create components from architecture", {
        error: error instanceof Error ? error.message : String(error),
        projectId,
        pageId,
      });
      throw new Error(
        `Component creation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 페이지 특성에 맞는 props를 생성합니다.
   */
  private generatePageSpecificProps(page: any, component: any): any {
    const pageName = page?.name || "";
    const pagePath = page?.path || "";

    // 기본 props
    const baseProps = {
      title: pageName,
      pagePath: pagePath,
    };

    // 컴포넌트 타입에 따른 특화된 props
    if (
      component.name === "FeedContainer" ||
      component.displayName.includes("Feed")
    ) {
      return {
        ...baseProps,
        title: `${pageName} - 최신 게시물`,
        description: "사용자들의 최신 게시물을 확인하세요",
        showFilters: true,
        sortBy: "latest",
      };
    } else if (
      component.name === "UserProfileCard" ||
      component.displayName.includes("Profile")
    ) {
      return {
        ...baseProps,
        title: `${pageName} - 사용자 프로필`,
        description: "사용자 정보와 활동 내역을 확인하세요",
        showStats: true,
        showPosts: true,
      };
    } else if (
      component.name === "AuthForm" ||
      component.displayName.includes("Auth")
    ) {
      return {
        ...baseProps,
        title: `${pageName} - 로그인/회원가입`,
        description: "계정에 로그인하거나 새 계정을 만드세요",
        showSocialLogin: true,
        showForgotPassword: true,
      };
    } else if (
      component.name === "PostEditor" ||
      component.displayName.includes("Editor")
    ) {
      return {
        ...baseProps,
        title: `${pageName} - 새 게시물 작성`,
        description: "새로운 게시물을 작성하고 공유하세요",
        allowImages: true,
        allowVideos: true,
        maxLength: 1000,
      };
    } else if (
      component.name === "PostItem" ||
      component.displayName.includes("Post")
    ) {
      return {
        ...baseProps,
        title: `${pageName} - 게시물 상세`,
        description: "게시물의 상세 내용과 댓글을 확인하세요",
        showComments: true,
        showLikes: true,
        showShare: true,
      };
    }

    // 기본 fallback
    return {
      ...baseProps,
      title: `Welcome to ${pageName}`,
      description: `${pageName} 페이지입니다.`,
    };
  }
}
