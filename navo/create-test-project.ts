import { db } from "./db/db";
import { sql } from "drizzle-orm";

async function createTestProject() {
  console.log("=== 🚀 테스트 프로젝트 생성 시작 ===");
  console.log("");

  try {
    // 1. 테스트 사용자 생성
    console.log("👤 테스트 사용자 생성 중...");
    const userResult = await db.execute(sql`
      INSERT INTO users (email, name, password)
      VALUES ('test@example.com', 'Test User', 'hashed_password_123')
      RETURNING id
    `);
    const userId = userResult[0].id;
    console.log(`✅ 사용자 생성 완료 (ID: ${userId})`);

    // 2. 테스트 프로젝트 생성
    console.log("📋 테스트 프로젝트 생성 중...");
    const projectResult = await db.execute(sql`
      INSERT INTO projects (owner_id, name, description)
      VALUES (${userId}, 'My First Project', '새로운 스키마로 생성된 테스트 프로젝트')
      RETURNING id
    `);
    const projectId = projectResult[0].id;
    console.log(`✅ 프로젝트 생성 완료 (ID: ${projectId})`);

    // 3. 기본 컴포넌트 정의 생성
    console.log("🔧 기본 컴포넌트 정의 생성 중...");

    // Hero 컴포넌트
    await db.execute(sql`
      INSERT INTO component_definitions (project_id, name, display_name, description, category, props_schema, render_template, css_styles)
      VALUES (
        ${projectId},
        'Hero',
        'Hero Section',
        '메인 히어로 섹션',
        'layout',
        '{"title": {"type": "string", "default": "Welcome"}, "subtitle": {"type": "string", "default": "Get started with your project"}, "cta": {"type": "string", "default": "Get Started"}}',
        '<div class="hero-section"><h1>{{title}}</h1><p>{{subtitle}}</p><button class="cta-button">{{cta}}</button></div>',
        '.hero-section { text-align: center; padding: 4rem 2rem; } .cta-button { background: #007bff; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.5rem; cursor: pointer; }'
      )
    `);

    // Feature 컴포넌트
    await db.execute(sql`
      INSERT INTO component_definitions (project_id, name, display_name, description, category, props_schema, render_template, css_styles)
      VALUES (
        ${projectId},
        'Feature',
        'Feature Section',
        '기능 소개 섹션',
        'content',
        '{"title": {"type": "string", "default": "Feature Title"}, "description": {"type": "string", "default": "Feature description goes here"}, "icon": {"type": "string", "default": "🚀"}}',
        '<div class="feature-section"><div class="icon">{{icon}}</div><h3>{{title}}</h3><p>{{description}}</p></div>',
        '.feature-section { text-align: center; padding: 2rem; } .icon { font-size: 3rem; margin-bottom: 1rem; }'
      )
    `);

    console.log("✅ 기본 컴포넌트 정의 생성 완료");

    // 4. 홈페이지 생성
    console.log("📄 홈페이지 생성 중...");
    const pageResult = await db.execute(sql`
      INSERT INTO pages (project_id, path, name, description, layout_json, is_published)
      VALUES (
        ${projectId},
        '/',
        'Home',
        '메인 홈페이지',
        '{"layout": "centered", "components": [{"id": "hero_1", "type": "Hero", "props": {"title": "Welcome to My Project", "subtitle": "This is a test project created with the new schema", "cta": "Get Started"}}, {"id": "feature_1", "type": "Feature", "props": {"title": "Easy to Use", "description": "Simple and intuitive interface", "icon": "✨"}}]}',
        true
      )
      RETURNING id
    `);
    const pageId = pageResult[0].id;
    console.log(`✅ 홈페이지 생성 완료 (ID: ${pageId})`);

    // 5. 컴포넌트 인스턴스 생성
    console.log("🧩 컴포넌트 인스턴스 생성 중...");

    // Hero 컴포넌트 인스턴스
    const heroDefResult = await db.execute(sql`
      SELECT id FROM component_definitions WHERE project_id = ${projectId} AND name = 'Hero'
    `);
    const heroDefId = heroDefResult[0].id;

    await db.execute(sql`
      INSERT INTO components (page_id, component_definition_id, props, order_index)
      VALUES (
        ${pageId},
        ${heroDefId},
        '{"title": "Welcome to My Project", "subtitle": "This is a test project created with the new schema", "cta": "Get Started"}',
        0
      )
    `);

    // Feature 컴포넌트 인스턴스
    const featureDefResult = await db.execute(sql`
      SELECT id FROM component_definitions WHERE project_id = ${projectId} AND name = 'Feature'
    `);
    const featureDefId = featureDefResult[0].id;

    await db.execute(sql`
      INSERT INTO components (page_id, component_definition_id, props, order_index)
      VALUES (
        ${pageId},
        ${featureDefId},
        '{"title": "Easy to Use", "description": "Simple and intuitive interface", "icon": "✨"}',
        1
      )
    `);

    console.log("✅ 컴포넌트 인스턴스 생성 완료");

    // 6. 결과 확인
    console.log("");
    console.log("📊 생성된 데이터 요약:");

    const userCount = await db.execute(sql`SELECT COUNT(*) FROM users`);
    const projectCount = await db.execute(sql`SELECT COUNT(*) FROM projects`);
    const componentDefCount = await db.execute(
      sql`SELECT COUNT(*) FROM component_definitions`
    );
    const pageCount = await db.execute(sql`SELECT COUNT(*) FROM pages`);
    const componentCount = await db.execute(
      sql`SELECT COUNT(*) FROM components`
    );

    console.log(`   👤 사용자: ${userCount[0].count}개`);
    console.log(`   📋 프로젝트: ${projectCount[0].count}개`);
    console.log(`   🔧 컴포넌트 정의: ${componentDefCount[0].count}개`);
    console.log(`   📄 페이지: ${pageCount[0].count}개`);
    console.log(`   🧩 컴포넌트: ${componentCount[0].count}개`);

    console.log("");
    console.log("🎉 테스트 프로젝트 생성 완료!");
    console.log("이제 프론트엔드에서 동적 렌더링을 테스트할 수 있습니다.");
  } catch (error) {
    console.error("❌ 테스트 프로젝트 생성 중 오류 발생:", error);
  }
}

// 실행
createTestProject().catch(console.error);
