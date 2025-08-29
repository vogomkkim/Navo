import dotenv from "dotenv";
import { db } from "./db/db.js";
import {
  projects,
  pages,
  componentDefinitions,
  components,
} from "./db/schema.js";
import { eq } from "drizzle-orm";

// 환경 변수 로드
dotenv.config();

async function checkProjectDetails(projectName?: string) {
  console.log("=== 🔍 프로젝트 상세 내용 확인 ===");
  console.log(`🌍 환경: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `🗄️ 데이터베이스: ${process.env.DATABASE_URL ? "연결됨" : "연결 안됨"}`
  );

  try {
    let targetProjects;

    if (projectName) {
      // 특정 프로젝트명으로 검색
      console.log(`\n📁 프로젝트 "${projectName}" 검색 중...`);
      targetProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.name, projectName));
    } else {
      // 모든 프로젝트 조회
      console.log("\n📁 모든 프로젝트 조회 중...");
      targetProjects = await db.select().from(projects);
    }

    if (targetProjects.length === 0) {
      console.log("❌ 프로젝트를 찾을 수 없습니다.");
      return;
    }

    console.log(`\n✅ ${targetProjects.length}개의 프로젝트를 찾았습니다.`);

    // 각 프로젝트의 상세 내용 확인
    for (const project of targetProjects) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`🏗️ 프로젝트: ${project.name}`);
      console.log(`📝 설명: ${project.description}`);
      console.log(`🆔 ID: ${project.id}`);
      console.log(`👤 소유자: ${project.ownerId}`);
      console.log(`📅 생성일: ${project.createdAt}`);
      console.log(`🔄 수정일: ${project.updatedAt}`);

      // 해당 프로젝트의 페이지 확인
      console.log(`\n📄 페이지 목록:`);
      const projectPages = await db
        .select()
        .from(pages)
        .where(eq(pages.projectId, project.id));

      if (projectPages.length === 0) {
        console.log("  - 페이지가 없습니다.");
      } else {
        projectPages.forEach((page, index) => {
          console.log(`  ${index + 1}. ${page.name} (ID: ${page.id})`);
          console.log(`     경로: ${page.path}`);
          console.log(`     설명: ${page.description}`);
          console.log(`     타입: ${page.type}`);
          console.log(`     생성일: ${page.createdAt}`);
          console.log(`     수정일: ${page.updatedAt}`);
        });
      }

      // 해당 프로젝트의 컴포넌트 정의 확인
      console.log(`\n🧩 컴포넌트 정의 목록:`);
      const projectComponentDefs = await db
        .select()
        .from(componentDefinitions)
        .where(eq(componentDefinitions.projectId, project.id));

      if (projectComponentDefs.length === 0) {
        console.log("  - 컴포넌트 정의가 없습니다.");
      } else {
        projectComponentDefs.forEach((comp, index) => {
          console.log(`  ${index + 1}. ${comp.name} (ID: ${comp.id})`);
          console.log(`     표시명: ${comp.displayName}`);
          console.log(`     타입: ${comp.category}`);
          console.log(`     설명: ${comp.description}`);
          console.log(`     생성일: ${comp.createdAt}`);
          console.log(`     수정일: ${comp.updatedAt}`);
        });
      }

      // 해당 프로젝트의 컴포넌트 확인
      console.log(`\n🔧 컴포넌트 목록:`);
      const projectComponents = await db
        .select({
          component: components,
          page: pages,
          componentDef: componentDefinitions,
        })
        .from(components)
        .leftJoin(pages, eq(components.pageId, pages.id))
        .leftJoin(
          componentDefinitions,
          eq(components.componentDefinitionId, componentDefinitions.id)
        )
        .where(eq(pages.projectId, project.id));

      if (projectComponents.length === 0) {
        console.log("  - 컴포넌트가 없습니다.");
      } else {
        projectComponents.forEach((item, index) => {
          console.log(
            `  ${index + 1}. ${item.componentDef?.name || "Unknown"} (ID: ${item.component.id})`
          );
          console.log(
            `     페이지: ${item.page?.name || "Unknown"} (${item.page?.path})`
          );
          console.log(`     순서: ${item.component.order}`);
          console.log(`     생성일: ${item.component.createdAt}`);
          console.log(`     수정일: ${item.component.updatedAt}`);
        });
      }
    }
  } catch (error) {
    console.error("❌ 프로젝트 상세 내용 확인 중 오류 발생:", error);
  }
}

// 스크립트 실행
// 특정 프로젝트명을 인자로 전달하거나, 빈 문자열로 모든 프로젝트 확인
const projectName = process.argv[2] || ""; // 명령줄 인자로 프로젝트명 전달
checkProjectDetails(projectName || undefined).catch(console.error);
