import { db } from "./db/db";
import { sql } from "drizzle-orm";

async function dropAllTables() {
  console.log("=== 🗑️ 모든 테이블 삭제 시작 ===");
  console.log("");

  try {
    // 모든 테이블 삭제 (CASCADE로 관련 객체도 함께 삭제)
    console.log("🚀 테이블 삭제 중...");

    await db.execute(sql`DROP SCHEMA public CASCADE`);
    await db.execute(sql`CREATE SCHEMA public`);
    await db.execute(sql`GRANT ALL ON SCHEMA public TO postgres`);
    await db.execute(sql`GRANT ALL ON SCHEMA public TO public`);

    console.log("✅ 모든 테이블 삭제 완료");
    console.log("");
  } catch (error) {
    console.error("❌ 테이블 삭제 중 오류 발생:", error);
  }
}

// 실행
dropAllTables().catch(console.error);
