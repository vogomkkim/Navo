import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  unique,
  bigserial,
} from "drizzle-orm/pg-core";
import { eq, sql, desc } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  password: text("password").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    requirements: text("requirements"), // 사용자 요구사항 저장
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    ownerIdx: index("idx_projects_owner").on(table.ownerId),
  })
);

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    layoutJson: jsonb("layout_json").notNull().default("{}"),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectPathUnique: unique("pages_project_id_path_unique").on(
      table.projectId,
      table.path
    ),
    projectIdx: index("idx_pages_project").on(table.projectId),
  })
);

export const componentDefinitions = pgTable(
  "component_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(), // 프로젝트 내에서 유니크
    displayName: varchar("display_name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 255 }).notNull().default("basic"),
    propsSchema: jsonb("props_schema").notNull().default("{}"),
    renderTemplate: text("render_template").notNull(),
    cssStyles: text("css_styles"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectNameUnique: unique("component_definitions_project_name_unique").on(
      table.projectId,
      table.name
    ),
    projectIdx: index("idx_component_definitions_project").on(table.projectId),
  })
);

export const components = pgTable(
  "components",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    componentDefinitionId: uuid("component_definition_id")
      .notNull()
      .references(() => componentDefinitions.id, { onDelete: "cascade" }),
    props: jsonb("props").notNull().default("{}"),
    order: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pageIdx: index("idx_components_page").on(table.pageId),
  })
);

export const suggestions = pgTable("suggestions", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull(),
  type: varchar("type", { length: 255 }).notNull(),
  content: jsonb("content").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true, mode: "date" }),
});

export const assets = pgTable("assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull(),
  kind: varchar("kind", { length: 255 }).notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: uuid("project_id"),
    userId: uuid("user_id"),
    type: varchar("type", { length: 255 }).notNull(),
    data: jsonb("data").default("{}"),
    ts: timestamp("ts", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectTsIdx: index("idx_events_project_ts").on(table.projectId, table.ts),
  })
);

export const publishDeploys = pgTable("publish_deploys", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull(),
  url: text("url").notNull(),
  status: varchar("status", { length: 255 }).notNull(),
  vercelDeploymentId: varchar("vercel_deployment_id", { length: 255 }).unique(), // Added column
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    sessionData: jsonb("session_data").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    version: integer("version").notNull().default(1),
  },
  (table) => ({
    userIdx: index("idx_user_sessions_user").on(table.userId),
    createdAtIdx: index("idx_user_sessions_created_at").on(table.createdAt),
    // JSON 안정성 체크 제약
    sessionDataCheck: sql`check (jsonb_typeof(session_data) = 'object')`,
  })
);

// 대화 메시지 테이블
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => userSessions.id, { onDelete: "cascade" }),
    messageType: text("message_type").notNull(), // user, assistant
    content: text("content").notNull(),
    metadata: jsonb("metadata").default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    version: integer("version").notNull().default(1),
  },
  (table) => ({
    sessionTimeIdx: index("idx_chat_messages_session_time").on(
      table.sessionId,
      desc(table.createdAt)
    ),
    messageTypeIdx: index("idx_chat_messages_type").on(table.messageType),
    // JSON 안정성 체크 제약
    metadataCheck: sql`check (jsonb_typeof(metadata) = 'object')`,
  })
);

// 세션 요약 테이블
export const chatSessionSummaries = pgTable(
  "chat_session_summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => userSessions.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    keyPoints: jsonb("key_points").default("[]"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    version: integer("version").notNull().default(1),
  },
  (table) => ({
    sessionIdx: index("idx_chat_session_summaries_session").on(table.sessionId),
    // JSON 안정성 체크 제약
    keyPointsCheck: sql`check (jsonb_typeof(key_points) = 'array')`,
  })
);
