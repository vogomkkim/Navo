import { db } from "./db/db.js";
import {
  users,
  projects,
  pages,
  componentDefinitions,
  components,
} from "./db/schema.js";
import { eq, sql } from "drizzle-orm";

async function checkCascadeDelete() {
  console.log("=== 🔍 Cascade Delete 영향 확인 ===");

  try {
    // 1. 사용자별 프로젝트 수 확인
    console.log("\n👥 사용자별 프로젝트 수:");
    const userProjects = await db
      .select({
        userId: users.id,
        userEmail: users.email,
        projectCount: sql<number>`count(${projects.id})`,
      })
      .from(users)
      .leftJoin(projects, eq(users.id, projects.ownerId))
      .groupBy(users.id, users.email);

    userProjects.forEach((user) => {
      console.log(`  ${user.userEmail}: ${user.projectCount}개 프로젝트`);
    });

    // 2. 프로젝트별 페이지 수 확인
    console.log("\n📁 프로젝트별 페이지 수:");
    const projectPages = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        pageCount: sql<number>`count(${pages.id})`,
      })
      .from(projects)
      .leftJoin(pages, eq(projects.id, pages.projectId))
      .groupBy(projects.id, projects.name);

    projectPages.forEach((project) => {
      console.log(`  ${project.projectName}: ${project.pageCount}개 페이지`);
    });

    // 3. 프로젝트별 컴포넌트 정의 수 확인
    console.log("\n🧩 프로젝트별 컴포넌트 정의 수:");
    const projectComponentDefs = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        componentDefCount: sql<number>`count(${componentDefinitions.id})`,
      })
      .from(projects)
      .leftJoin(
        componentDefinitions,
        eq(projects.id, componentDefinitions.projectId)
      )
      .groupBy(projects.id, projects.name);

    projectComponentDefs.forEach((project) => {
      console.log(
        `  ${project.projectName}: ${project.componentDefCount}개 컴포넌트 정의`
      );
    });

    // 4. 페이지별 컴포넌트 수 확인
    console.log("\n🔧 페이지별 컴포넌트 수:");
    const pageComponents = await db
      .select({
        pageId: pages.id,
        pageName: pages.name,
        projectName: projects.name,
        componentCount: sql<number>`count(${components.id})`,
      })
      .from(pages)
      .leftJoin(projects, eq(pages.projectId, projects.id))
      .leftJoin(components, eq(pages.id, components.pageId))
      .groupBy(pages.id, pages.name, projects.name);

    pageComponents.forEach((page) => {
      console.log(
        `  ${page.pageName} (${page.projectName}): ${page.componentCount}개 컴포넌트`
      );
    });

    // 5. 전체 데이터 요약
    console.log("\n📊 전체 데이터 요약:");
    const totalUsers = await db.select().from(users);
    const totalProjects = await db.select().from(projects);
    const totalPages = await db.select().from(pages);
    const totalComponentDefs = await db.select().from(componentDefinitions);
    const totalComponents = await db.select().from(components);

    console.log(`   👥 총 사용자: ${totalUsers.length}명`);
    console.log(`   📁 총 프로젝트: ${totalProjects.length}개`);
    console.log(`   📄 총 페이지: ${totalPages.length}개`);
    console.log(`   🧩 총 컴포넌트 정의: ${totalComponentDefs.length}개`);
    console.log(`   🔧 총 컴포넌트: ${totalComponents.length}개`);

    // 6. Cascade Delete 시나리오 시뮬레이션
    console.log("\n⚠️ Cascade Delete 시나리오:");
    console.log("   사용자 삭제 시:");
    console.log(`     - ${totalProjects.length}개 프로젝트 삭제`);
    console.log(`     - ${totalPages.length}개 페이지 삭제`);
    console.log(`     - ${totalComponentDefs.length}개 컴포넌트 정의 삭제`);
    console.log(`     - ${totalComponents.length}개 컴포넌트 삭제`);

    console.log("\n   프로젝트 삭제 시:");
    const projectWithMostPages = projectPages.reduce((max, current) =>
      current.pageCount > max.pageCount ? current : max
    );
    console.log(
      `     - ${projectWithMostPages.projectName}: ${projectWithMostPages.pageCount}개 페이지 삭제`
    );

    const projectWithMostComponentDefs = projectComponentDefs.reduce(
      (max, current) =>
        current.componentDefCount > max.componentDefCount ? current : max
    );
    console.log(
      `     - ${projectWithMostComponentDefs.projectName}: ${projectWithMostComponentDefs.componentDefCount}개 컴포넌트 정의 삭제`
    );

    console.log("\n✅ Cascade Delete 영향 확인 완료");
  } catch (error) {
    console.error("❌ Cascade Delete 영향 확인 중 오류 발생:", error);
  }
}

checkCascadeDelete().catch(console.error);
