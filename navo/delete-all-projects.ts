import { db } from "./db/db";
import { projects, pages, componentDefinitions } from "./db/schema";
import { eq, inArray } from "drizzle-orm";

async function deleteAllProjects() {
  console.log("=== 🗑️ 모든 프로젝트 및 관련 데이터 삭제 시작 ===");
  console.log("");

  try {
    // 1. 현재 상태 확인
    console.log("📋 삭제 전 상태:");
    const allProjects = await db.select().from(projects);
    const allPages = await db.select().from(pages);
    const allComponentDefs = await db.select().from(componentDefinitions);

    console.log(`   프로젝트: ${allProjects.length}개`);
    console.log(`   페이지: ${allPages.length}개`);
    console.log(`   컴포넌트 정의: ${allComponentDefs.length}개`);
    console.log("");

    if (allProjects.length === 0) {
      console.log("❌ 삭제할 프로젝트가 없습니다.");
      return;
    }

    // 2. 삭제 확인
    console.log("⚠️  주의사항:");
    console.log("   - 이 작업은 되돌릴 수 없습니다.");
    console.log("   - 모든 프로젝트와 관련 데이터가 삭제됩니다.");
    console.log("   - 컴포넌트 정의도 함께 삭제됩니다.");
    console.log("");

    // 3. 실제 삭제 실행
    console.log("🚀 삭제 실행 중...");

    // 컴포넌트 정의 삭제 (프로젝트와 독립적이지만 함께 정리)
    console.log("   🔧 컴포넌트 정의 삭제 중...");
    await db.delete(componentDefinitions);
    console.log("   ✅ 컴포넌트 정의 삭제 완료");

    // 페이지 삭제 (프로젝트 삭제 시 자동으로 삭제됨)
    console.log("   📄 페이지 삭제 중...");
    await db.delete(pages);
    console.log("   ✅ 페이지 삭제 완료");

    // 프로젝트 삭제
    console.log("   📋 프로젝트 삭제 중...");
    await db.delete(projects);
    console.log("   ✅ 프로젝트 삭제 완료");

    // 4. 삭제 후 상태 확인
    console.log("");
    console.log("📊 삭제 후 상태:");
    const remainingProjects = await db.select().from(projects);
    const remainingPages = await db.select().from(pages);
    const remainingComponentDefs = await db.select().from(componentDefinitions);

    console.log(`   프로젝트: ${remainingProjects.length}개`);
    console.log(`   페이지: ${remainingPages.length}개`);
    console.log(`   컴포넌트 정의: ${remainingComponentDefs.length}개`);
    console.log("");

    console.log("🎉 모든 데이터 삭제 완료!");
    console.log("이제 새로운 설계로 시작할 수 있습니다.");
  } catch (error) {
    console.error("❌ 삭제 중 오류 발생:", error);
  }
}

// 실행
deleteAllProjects().catch(console.error);
