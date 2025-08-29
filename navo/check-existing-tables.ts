import { db } from "./db/db";
import { projects, pages, componentDefinitions } from "./db/schema";

async function checkExistingTables() {
  console.log("=== 🔍 실제 존재하는 테이블 확인 ===");
  console.log("");

  try {
    // 1. 프로젝트 확인
    console.log("📋 프로젝트 테이블:");
    const allProjects = await db.select().from(projects);
    console.log(`   총 ${allProjects.length}개 프로젝트`);
    allProjects.forEach((project, index) => {
      console.log(`   ${index + 1}. ${project.name} (ID: ${project.id})`);
    });
    console.log("");

    // 2. 페이지 확인
    console.log("📄 페이지 테이블:");
    const allPages = await db.select().from(pages);
    console.log(`   총 ${allPages.length}개 페이지`);
    allPages.forEach((page, index) => {
      console.log(
        `   ${index + 1}. ${page.path} (프로젝트: ${page.projectId})`
      );
    });
    console.log("");

    // 3. 컴포넌트 정의 확인
    console.log("🔧 컴포넌트 정의 테이블:");
    const allComponentDefs = await db.select().from(componentDefinitions);
    console.log(`   총 ${allComponentDefs.length}개 컴포넌트 정의`);
    allComponentDefs.forEach((def, index) => {
      console.log(`   ${index + 1}. ${def.name} (${def.displayName})`);
    });
    console.log("");

    // 4. 삭제 영향도 요약
    console.log("📊 삭제 영향도 요약:");
    console.log(`   📄 페이지: ${allPages.length}개`);
    console.log(
      `   🔧 컴포넌트 정의: ${allComponentDefs.length}개 (삭제되지 않음)`
    );
    console.log("");

    console.log("⚠️  주의사항:");
    console.log("   - 프로젝트 삭제 시 관련 페이지들이 삭제됩니다.");
    console.log("   - 컴포넌트 정의는 프로젝트와 독립적이므로 유지됩니다.");
    console.log("");
  } catch (error) {
    console.error("❌ 오류 발생:", error);
  }
}

// 실행
checkExistingTables().catch(console.error);
