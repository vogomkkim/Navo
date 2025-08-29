import { db } from "./db/db";
import { sql } from "drizzle-orm";

async function showTableDDL() {
  console.log("=== 🔍 테이블 DDL 및 제약조건 확인 ===");
  console.log("");

  try {
    // 1. users 테이블 정보
    console.log("👤 users 테이블:");
    const usersInfo = await db.execute(sql`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    usersInfo.forEach((col) => {
      const nullable = col.is_nullable === "YES" ? "NULL" : "NOT NULL";
      const defaultVal = col.column_default
        ? ` DEFAULT ${col.column_default}`
        : "";
      const length = col.character_maximum_length
        ? `(${col.character_maximum_length})`
        : "";
      console.log(
        `   ${col.column_name} ${col.data_type}${length} ${nullable}${defaultVal}`
      );
    });

    // users 테이블 제약조건
    const usersConstraints = await db.execute(sql`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'users'
    `);

    if (usersConstraints.length > 0) {
      console.log("   제약조건:");
      usersConstraints.forEach((constraint) => {
        console.log(
          `     ${constraint.constraint_name}: ${constraint.constraint_type} on ${constraint.column_name}`
        );
      });
    }
    console.log("");

    // 2. projects 테이블 정보
    console.log("📋 projects 테이블:");
    const projectsInfo = await db.execute(sql`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'projects'
      ORDER BY ordinal_position
    `);

    projectsInfo.forEach((col) => {
      const nullable = col.is_nullable === "YES" ? "NULL" : "NOT NULL";
      const defaultVal = col.column_default
        ? ` DEFAULT ${col.column_default}`
        : "";
      const length = col.character_maximum_length
        ? `(${col.character_maximum_length})`
        : "";
      console.log(
        `   ${col.column_name} ${col.data_type}${length} ${nullable}${defaultVal}`
      );
    });

    // projects 테이블 제약조건
    const projectsConstraints = await db.execute(sql`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'projects'
    `);

    if (projectsConstraints.length > 0) {
      console.log("   제약조건:");
      projectsConstraints.forEach((constraint) => {
        if (constraint.constraint_type === "FOREIGN KEY") {
          console.log(
            `     ${constraint.constraint_name}: ${constraint.constraint_type} (${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name})`
          );
        } else {
          console.log(
            `     ${constraint.constraint_name}: ${constraint.constraint_type} on ${constraint.column_name}`
          );
        }
      });
    }
    console.log("");

    // 3. component_definitions 테이블 정보
    console.log("🔧 component_definitions 테이블:");
    const componentDefsInfo = await db.execute(sql`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'component_definitions'
      ORDER BY ordinal_position
    `);

    componentDefsInfo.forEach((col) => {
      const nullable = col.is_nullable === "YES" ? "NULL" : "NOT NULL";
      const defaultVal = col.column_default
        ? ` DEFAULT ${col.column_default}`
        : "";
      const length = col.character_maximum_length
        ? `(${col.character_maximum_length})`
        : "";
      console.log(
        `   ${col.column_name} ${col.data_type}${length} ${nullable}${defaultVal}`
      );
    });

    // component_definitions 테이블 제약조건
    const componentDefsConstraints = await db.execute(sql`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'component_definitions'
    `);

    if (componentDefsConstraints.length > 0) {
      console.log("   제약조건:");
      componentDefsConstraints.forEach((constraint) => {
        if (constraint.constraint_type === "FOREIGN KEY") {
          console.log(
            `     ${constraint.constraint_name}: ${constraint.constraint_type} (${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name})`
          );
        } else if (constraint.constraint_type === "UNIQUE") {
          console.log(
            `     ${constraint.constraint_name}: ${constraint.constraint_type} on ${constraint.column_name}`
          );
        } else {
          console.log(
            `     ${constraint.constraint_name}: ${constraint.constraint_type} on ${constraint.column_name}`
          );
        }
      });
    }
    console.log("");

    // 4. pages 테이블 정보
    console.log("📄 pages 테이블:");
    const pagesInfo = await db.execute(sql`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'pages'
      ORDER BY ordinal_position
    `);

    pagesInfo.forEach((col) => {
      const nullable = col.is_nullable === "YES" ? "NULL" : "NOT NULL";
      const defaultVal = col.column_default
        ? ` DEFAULT ${col.column_default}`
        : "";
      const length = col.character_maximum_length
        ? `(${col.character_maximum_length})`
        : "";
      console.log(
        `   ${col.column_name} ${col.data_type}${length} ${nullable}${defaultVal}`
      );
    });

    // pages 테이블 제약조건
    const pagesConstraints = await db.execute(sql`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'pages'
    `);

    if (pagesConstraints.length > 0) {
      console.log("   제약조건:");
      pagesConstraints.forEach((constraint) => {
        if (constraint.constraint_type === "FOREIGN KEY") {
          console.log(
            `     ${constraint.constraint_name}: ${constraint.constraint_type} (${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name})`
          );
        } else if (constraint.constraint_type === "UNIQUE") {
          console.log(
            `     ${constraint.constraint_name}: ${constraint.constraint_type} on ${constraint.column_name}`
          );
        } else {
          console.log(
            `     ${constraint.constraint_name}: ${constraint.constraint_type} on ${constraint.column_name}`
          );
        }
      });
    }
    console.log("");

    // 5. components 테이블 정보
    console.log("🧩 components 테이블:");
    const componentsInfo = await db.execute(sql`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'components'
      ORDER BY ordinal_position
    `);

    componentsInfo.forEach((col) => {
      const nullable = col.is_nullable === "YES" ? "NULL" : "NOT NULL";
      const defaultVal = col.column_default
        ? ` DEFAULT ${col.column_default}`
        : "";
      const length = col.character_maximum_length
        ? `(${col.character_maximum_length})`
        : "";
      console.log(
        `   ${col.column_name} ${col.data_type}${length} ${nullable}${defaultVal}`
      );
    });

    // components 테이블 제약조건
    const componentsConstraints = await db.execute(sql`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'components'
    `);

    if (componentsConstraints.length > 0) {
      console.log("   제약조건:");
      componentsConstraints.forEach((constraint) => {
        if (constraint.constraint_type === "FOREIGN KEY") {
          console.log(
            `     ${constraint.constraint_name}: ${constraint.constraint_type} (${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name})`
          );
        } else {
          console.log(
            `     ${constraint.constraint_name}: ${constraint.constraint_type} on ${constraint.column_name}`
          );
        }
      });
    }
    console.log("");

    // 6. 인덱스 정보
    console.log("📊 인덱스 정보:");
    const indexes = await db.execute(sql`
      SELECT
        indexname,
        tablename,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    indexes.forEach((idx) => {
      console.log(`   ${idx.tablename}.${idx.indexname}: ${idx.indexdef}`);
    });
  } catch (error) {
    console.error("❌ 테이블 정보 조회 중 오류 발생:", error);
  }
}

// 실행
showTableDDL().catch(console.error);
