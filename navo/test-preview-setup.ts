import { db } from "./db/db.js";
import { users, projects, pages, componentDefinitions } from "./db/schema.js";
import { hashPassword } from "./auth/password.js";
import { eq } from "drizzle-orm";

async function setupPreviewTestData() {
  console.log("🚀 Setting up preview test data...");

  try {
    // 1. Create test user
    const testUserId = "550e8400-e29b-41d4-a716-446655440000";
    const hashedPassword = await hashPassword("test123");

    await db
      .insert(users)
      .values({
        id: testUserId,
        email: "test@example.com",
        name: "Test User",
        password: hashedPassword,
      })
      .onConflictDoNothing();

    console.log("✅ Test user created");

    // 2. Create test project
    const testProjectId = "550e8400-e29b-41d4-a716-446655440001";

    await db
      .insert(projects)
      .values({
        id: testProjectId,
        ownerId: testUserId,
        name: "Preview Test Project",
      })
      .onConflictDoNothing();

    console.log("✅ Test project created");

    // 3. Create test page with sample layout
    const testPageId = "550e8400-e29b-41d4-a716-446655440002";

    const sampleLayout = {
      components: [
        {
          id: "comp-1",
          type: "Header",
          props: {
            title: "나의 첫 번째 프로젝트",
            subtitle: "AI와 함께 만드는 웹사이트",
            style: "color: #1f2937; font-size: 2rem;",
          },
        },
        {
          id: "comp-2",
          type: "Hero",
          props: {
            headline: "환영합니다!",
            cta: "시작하기",
            style:
              "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4rem 2rem;",
          },
        },
        {
          id: "comp-3",
          type: "AuthForm",
          props: {
            title: "로그인",
            emailPlaceholder: "이메일을 입력하세요",
            passwordPlaceholder: "비밀번호를 입력하세요",
            buttonText: "로그인하기",
            style: "margin: 2rem auto;",
          },
        },
        {
          id: "comp-4",
          type: "Footer",
          props: {
            text: "© 2024 Navo - AI 기반 웹사이트 빌더",
            style: "color: #6b7280; font-size: 0.875rem;",
          },
        },
      ],
    };

    await db
      .insert(pages)
      .values({
        id: testPageId,
        projectId: testProjectId,
        path: "/",
        layoutJson: sampleLayout,
      })
      .onConflictDoNothing();

    console.log("✅ Test page created with sample layout");

    // 4. Seed component definitions
    const componentDefs = [
      {
        name: "Header",
        displayName: "Header",
        description: "페이지 헤더",
        category: "basic",
        propsSchema: {
          type: "object",
          properties: {
            title: { type: "string", title: "제목" },
            subtitle: { type: "string", title: "부제목" },
            style: { type: "object", title: "스타일" },
          },
        },
        renderTemplate:
          '<header class="component-header" data-id="{{id}}" style="{{style}}"><h1 data-editable="true" data-prop-name="title">{{title}}</h1><h2 data-editable="true" data-prop-name="subtitle">{{subtitle}}</h2></header>',
        cssStyles:
          ".component-header { padding: 2rem; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }",
      },
      {
        name: "Hero",
        displayName: "히어로 섹션",
        description: "메인 히어로 섹션",
        category: "basic",
        propsSchema: {
          type: "object",
          properties: {
            headline: { type: "string", title: "헤드라인" },
            cta: { type: "string", title: "콜투액션" },
            style: { type: "object", title: "스타일" },
          },
        },
        renderTemplate:
          '<section class="component-hero" data-id="{{id}}" style="{{style}}"><div class="hero-content"><h2 data-editable="true" data-prop-name="headline">{{headline}}</h2><button data-editable="true" data-prop-name="cta" class="cta-button">{{cta}}</button></div></section>',
        cssStyles:
          ".component-hero { text-align: center; } .hero-content { max-width: 800px; margin: 0 auto; } .cta-button { background: #3b82f6; color: white; border: none; padding: 1rem 2rem; border-radius: 0.5rem; font-size: 1.125rem; margin-top: 2rem; cursor: pointer; } .cta-button:hover { background: #2563eb; }",
      },
      {
        name: "AuthForm",
        displayName: "인증 폼",
        description: "로그인/회원가입 폼",
        category: "forms",
        propsSchema: {
          type: "object",
          properties: {
            title: { type: "string", title: "폼 제목" },
            emailPlaceholder: { type: "string", title: "이메일 플레이스홀더" },
            passwordPlaceholder: {
              type: "string",
              title: "비밀번호 플레이스홀더",
            },
            buttonText: { type: "string", title: "버튼 텍스트" },
            style: { type: "object", title: "스타일" },
          },
        },
        renderTemplate:
          '<div class="component-auth-form" data-id="{{id}}" style="{{style}}"><form class="auth-form"><h3 data-editable="true" data-prop-name="title">{{title}}</h3><input type="email" placeholder="{{emailPlaceholder}}" class="auth-input" data-prop-name="email"/><input type="password" placeholder="{{passwordPlaceholder}}" class="auth-input" data-prop-name="password"/><button type="submit" class="auth-button">{{buttonText}}</button></form></div>',
        cssStyles:
          ".component-auth-form { max-width: 400px; margin: 2rem auto; padding: 2rem; background: white; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); } .auth-form { display: flex; flex-direction: column; gap: 1rem; } .auth-input { padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 1rem; } .auth-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); } .auth-button { background: #3b82f6; color: white; border: none; padding: 0.75rem; border-radius: 0.375rem; font-size: 1rem; cursor: pointer; } .auth-button:hover { background: #2563eb; }",
      },
      {
        name: "Footer",
        displayName: "푸터",
        description: "페이지 푸터",
        category: "basic",
        propsSchema: {
          type: "object",
          properties: {
            text: { type: "string", title: "푸터 텍스트" },
            style: { type: "object", title: "스타일" },
          },
        },
        renderTemplate:
          '<footer class="component-footer" data-id="{{id}}" style="{{style}}"><p data-editable="true" data-prop-name="text">{{text}}</p></footer>',
        cssStyles:
          ".component-footer { padding: 2rem; text-align: center; background: #f9fafb; border-top: 1px solid #e5e7eb; }",
      },
    ];

    for (const def of componentDefs) {
      await db
        .insert(componentDefinitions)
        .values(def)
        .onConflictDoUpdate({
          target: componentDefinitions.name,
          set: {
            displayName: def.displayName,
            description: def.description,
            category: def.category,
            propsSchema: def.propsSchema,
            renderTemplate: def.renderTemplate,
            cssStyles: def.cssStyles,
            isActive: true,
            updatedAt: new Date(),
          },
        });
    }

    console.log("✅ Component definitions seeded");

    console.log("\n🎉 Preview test data setup complete!");
    console.log("\n📋 Test Data Summary:");
    console.log(`- User: test@example.com / test123`);
    console.log(`- Project ID: ${testProjectId}`);
    console.log(`- Page ID: ${testPageId}`);
    console.log("\n🚀 You can now test the preview functionality!");
  } catch (error) {
    console.error("❌ Error setting up test data:", error);
  }
}

// Run the setup
setupPreviewTestData()
  .then(() => {
    console.log("\n🏁 Setup script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Setup script failed:", error);
    process.exit(1);
  });
