# 🚀 새로운 테이블 설계

## **현재 코드 관점 분석:**

### **1. 동적 렌더링 시스템:**

- `DynamicComponentRenderer`: 컴포넌트 타입으로 렌더링
- `LayoutRenderer`: 페이지 레이아웃 JSON을 렌더링
- `EditableText`: Props 편집 기능

### **2. 데이터 흐름:**

- 프로젝트 선택 → 페이지 선택 → 레이아웃 렌더링
- 컴포넌트 Props 실시간 편집
- 페이지별 고유한 레이아웃

## **새로운 설계 원칙:**

### **1. 프로젝트 종속성:**

- **모든 데이터**는 프로젝트에 종속
- **프로젝트 삭제 시** 모든 관련 데이터 CASCADE 삭제
- **프로젝트별 독립적인** 컴포넌트 정의

### **2. 컴포넌트 시스템:**

- **컴포넌트 정의**: 프로젝트별 고유한 디자인과 Props
- **컴포넌트 인스턴스**: 페이지별 실제 사용되는 컴포넌트
- **Props 스키마**: 컴포넌트별 유효성 검증 규칙

## **새로운 테이블 구조:**

### **1. projects (프로젝트)**

```typescript
export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});
```

### **2. componentDefinitions (컴포넌트 정의)**

```typescript
export const componentDefinitions = pgTable("component_definitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(), // 프로젝트 내에서 유니크
  displayName: varchar("display_name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 255 }).notNull().default("basic"),
  propsSchema: jsonb("props_schema").notNull().default({}),
  renderTemplate: text("render_template").notNull(),
  cssStyles: text("css_styles"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});
```

### **3. pages (페이지)**

```typescript
export const pages = pgTable("pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  path: text("path").notNull(), // 프로젝트 내에서 유니크
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  layoutJson: jsonb("layout_json").notNull().default({}),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});
```

### **4. components (컴포넌트 인스턴스)**

```typescript
export const components = pgTable("components", {
  id: uuid("id").defaultRandom().primaryKey(),
  pageId: uuid("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  componentDefinitionId: uuid("component_definition_id")
    .notNull()
    .references(() => componentDefinitions.id),
  props: jsonb("props").notNull().default({}),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});
```

## **주요 변경사항:**

### **1. 컴포넌트 정의:**

- **`projectId` 추가**: 프로젝트별 독립적인 컴포넌트
- **`name` 유니크 제약**: 프로젝트 내에서만 유니크
- **CASCADE 삭제**: 프로젝트 삭제 시 함께 삭제

### **2. 컴포넌트 인스턴스:**

- **`componentDefinitionId`**: 정의된 컴포넌트 참조
- **Props**: 실제 사용되는 데이터
- **페이지별 순서**: `orderIndex`로 렌더링 순서 제어

### **3. 데이터 무결성:**

- **외래키 제약**: 참조 무결성 보장
- **CASCADE 삭제**: 데이터 일관성 유지
- **프로젝트별 격리**: 완전한 독립성

## **장점:**

1. **프로젝트별 독립성**: 각 프로젝트가 고유한 컴포넌트 시스템
2. **확장성**: 새로운 컴포넌트 타입 쉽게 추가
3. **유지보수성**: 명확한 데이터 관계와 제약
4. **성능**: 프로젝트별 데이터 분리로 쿼리 최적화

## **다음 단계:**

1. **스키마 파일 수정** (`navo/db/schema.ts`)
2. **마이그레이션 생성** (`drizzle-kit generate`)
3. **데이터베이스 적용** (`drizzle-kit push`)
4. **새 프로젝트 생성 테스트**
