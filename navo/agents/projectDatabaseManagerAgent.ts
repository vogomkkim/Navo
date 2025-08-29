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
        createdAt: new Date(),
        updatedAt: new Date(),
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
          createdAt: new Date(),
          updatedAt: new Date(),
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
          id: uuidv4(),
          projectId,
          name: compData.name,
          display_name: compData.display_name || compData.name,
          type: compData.type || "ui",
          description: compData.description || `${compData.name} 컴포넌트`,
          props_schema: compData.props_schema || [],
          render_template:
            compData.render_template ||
            `<div class="${compData.name.toLowerCase()}">{content}</div>`,
          css_styles: compData.css_styles || "",
          createdAt: new Date(),
          updatedAt: new Date(),
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

      // 기본 컴포넌트 생성 (Header, Hero, Feature 등)
      const defaultComponents = [
        {
          name: "Header",
          componentDefinitionId: null, // 나중에 연결
          props: { title: "Welcome to " + projectArchitecture.name },
          order: 1,
        },
        {
          name: "Hero",
          componentDefinitionId: null,
          props: {
            title: "Get Started",
            subtitle: "AI가 생성한 프로젝트입니다",
            ctaText: "시작하기",
          },
          order: 2,
        },
        {
          name: "Feature",
          componentDefinitionId: null,
          props: {
            title: "주요 기능",
            description: "AI가 설계한 핵심 기능들",
          },
          order: 3,
        },
      ];

      const createdComponents = [];

      for (const compData of defaultComponents) {
        const newComponent = {
          id: uuidv4(),
          pageId,
          componentDefinitionId: compData.componentDefinitionId,
          props: compData.props,
          order: compData.order,
          createdAt: new Date(),
          updatedAt: new Date(),
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
}
