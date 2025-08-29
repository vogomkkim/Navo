import { db } from "./db/db";
import { sql } from "drizzle-orm";

async function createNewSchema() {
  console.log("=== 🚀 새로운 스키마 생성 시작 ===");
  console.log("");

  try {
    // 1. users 테이블 생성
    console.log("👤 users 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        password TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    console.log("✅ users 테이블 생성 완료");

    // 2. projects 테이블 생성
    console.log("📋 projects 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID NOT NULL REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    console.log("✅ projects 테이블 생성 완료");

    // 3. component_definitions 테이블 생성
    console.log("🔧 component_definitions 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE component_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(255) NOT NULL DEFAULT 'basic',
        props_schema JSONB NOT NULL DEFAULT '{}',
        render_template TEXT NOT NULL,
        css_styles TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE(project_id, name)
      )
    `);
    console.log("✅ component_definitions 테이블 생성 완료");

    // 4. pages 테이블 생성
    console.log("📄 pages 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        path TEXT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        layout_json JSONB NOT NULL DEFAULT '{}',
        is_published BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE(project_id, path)
      )
    `);
    console.log("✅ pages 테이블 생성 완료");

    // 5. components 테이블 생성
    console.log("🧩 components 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE components (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        component_definition_id UUID NOT NULL REFERENCES component_definitions(id) ON DELETE CASCADE,
        props JSONB NOT NULL DEFAULT '{}',
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    console.log("✅ components 테이블 생성 완료");

    // 5. 인덱스 생성
    console.log("📊 인덱스 생성 중...");
    await db.execute(sql`CREATE INDEX idx_users_email ON users(email)`);
    await db.execute(
      sql`CREATE INDEX idx_projects_owner ON projects(owner_id)`
    );
    await db.execute(sql`CREATE INDEX idx_pages_project ON pages(project_id)`);
    await db.execute(
      sql`CREATE INDEX idx_component_definitions_project ON component_definitions(project_id)`
    );
    await db.execute(
      sql`CREATE INDEX idx_components_page ON components(page_id)`
    );
    console.log("✅ 인덱스 생성 완료");

    console.log("");
    console.log("🎉 새로운 스키마 생성 완료!");
    console.log("이제 프로젝트를 생성할 수 있습니다.");
  } catch (error) {
    console.error("❌ 스키마 생성 중 오류 발생:", error);
  }
}

// 실행
createNewSchema().catch(console.error);
