import dotenv from "dotenv";
import { db } from "./db/db.js";
import {
  users,
  projects,
  pages,
  componentDefinitions,
  components,
} from "./db/schema.js";
import { sql } from "drizzle-orm";

// 환경 변수 로드
dotenv.config();

async function checkDatabaseStatus() {
  console.log("=== 🔍 데이터베이스 상태 확인 ===");
  console.log(`🌍 환경: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `🗄️ 데이터베이스: ${process.env.DATABASE_URL ? "연결됨" : "연결 안됨"}`
  );

  try {
    // 1. 사용자 테이블 확인
    console.log("\n👥 사용자 테이블:");
    const userCount = await db.select().from(users);
    console.log(`- 총 사용자 수: ${userCount.length}`);
    if (userCount.length > 0) {
      userCount.forEach((user, index) => {
        console.log(
          `  ${index + 1}. ID: ${user.id}, Email: ${user.email}, Name: ${user.name || "N/A"}, Created: ${user.createdAt}`
        );
      });
    }

    // 2. 프로젝트 테이블 확인
    console.log("\n📁 프로젝트 테이블:");
    const projectCount = await db.select().from(projects);
    console.log(`- 총 프로젝트 수: ${projectCount.length}`);
    if (projectCount.length > 0) {
      projectCount.forEach((project, index) => {
        console.log(
          `  ${index + 1}. ID: ${project.id}, Name: ${project.name}, Owner: ${project.ownerId}, Created: ${project.createdAt}`
        );
      });
    }

    // 3. 페이지 테이블 확인
    console.log("\n📄 페이지 테이블:");
    const pageCount = await db.select().from(pages);
    console.log(`- 총 페이지 수: ${pageCount.length}`);
    if (pageCount.length > 0) {
      pageCount.forEach((page, index) => {
        console.log(
          `  ${index + 1}. ID: ${page.id}, Name: ${page.name}, Project: ${page.projectId}, Path: ${page.path}, Created: ${page.createdAt}`
        );
      });
    }

    // 4. 컴포넌트 정의 테이블 확인
    console.log("\n🧩 컴포넌트 정의 테이블:");
    const componentDefCount = await db.select().from(componentDefinitions);
    console.log(`- 총 컴포넌트 정의 수: ${componentDefCount.length}`);
    if (componentDefCount.length > 0) {
      componentDefCount.forEach((comp, index) => {
        console.log(
          `  ${index + 1}. ID: ${comp.id}, Name: ${comp.name}, Display: ${comp.displayName}, Project: ${comp.projectId}, Created: ${comp.createdAt}`
        );
      });
    }

    // 5. 컴포넌트 테이블 확인
    console.log("\n🔧 컴포넌트 테이블:");
    const componentCount = await db.select().from(components);
    console.log(`- 총 컴포넌트 수: ${componentCount.length}`);
    if (componentCount.length > 0) {
      componentCount.forEach((comp, index) => {
        console.log(
          `  ${index + 1}. ID: ${comp.id}, Type: ${comp.componentDefinitionId}, Page: ${comp.pageId}, Created: ${comp.createdAt}`
        );
      });
    }

    // 6. 테이블별 레코드 수 요약
    console.log("\n📊 테이블별 레코드 수 요약:");
    console.log(`- users: ${userCount.length}`);
    console.log(`- projects: ${projectCount.length}`);
    console.log(`- pages: ${pageCount.length}`);
    console.log(`- componentDefinitions: ${componentDefCount.length}`);
    console.log(`- components: ${componentCount.length}`);

    // 7. 최근 생성된 데이터 확인
    if (projectCount.length > 0) {
      console.log("\n🆕 최근 생성된 프로젝트:");
      const recentProjects = await db
        .select()
        .from(projects)
        .orderBy(sql`${projects.createdAt} DESC`)
        .limit(3);
      recentProjects.forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.name} (${project.createdAt})`);
      });
    }

    if (pageCount.length > 0) {
      console.log("\n🆕 최근 생성된 페이지:");
      const recentPages = await db
        .select()
        .from(pages)
        .orderBy(sql`${pages.createdAt} DESC`)
        .limit(3);
      recentPages.forEach((page, index) => {
        console.log(
          `  ${index + 1}. ${page.name} (${page.path}) - ${page.createdAt}`
        );
      });
    }

    if (componentDefCount.length > 0) {
      console.log("\n🆕 최근 생성된 컴포넌트 정의:");
      const recentComponents = await db
        .select()
        .from(componentDefinitions)
        .orderBy(sql`${componentDefinitions.createdAt} DESC`)
        .limit(3);
      recentComponents.forEach((comp, index) => {
        console.log(
          `  ${index + 1}. ${comp.name} (${comp.category}) - ${comp.createdAt}`
        );
      });
    }
  } catch (error) {
    console.error("❌ 데이터베이스 상태 확인 중 오류 발생:", error);
  }
}

// 스크립트 실행
checkDatabaseStatus().catch(console.error);
