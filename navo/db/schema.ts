import {
  pgTable,
  index,
  check,
  uuid,
  jsonb,
  timestamp,
  integer,
  unique,
  varchar,
  text,
  foreignKey,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    sessionData: jsonb("session_data").default({}).notNull(),
    lastActivity: timestamp("last_activity", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    status: varchar("status", { length: 50 }).default("active").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    version: integer().default(1),
  },
  (table) => [
    index("idx_user_sessions_created_at").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops")
    ),
    index("idx_user_sessions_user_id").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_user_sessions_last_activity").using(
      "btree",
      table.lastActivity.asc().nullsLast().op("timestamptz_ops")
    ),
    index("idx_user_sessions_status").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops")
    ),
    check(
      "check_session_data_json",
      sql`jsonb_typeof(session_data) = 'object'::text`
    ),
  ]
);

export const users = pgTable(
  "users",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    email: varchar({ length: 255 }).notNull(),
    name: varchar({ length: 255 }),
    password: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique("users_email_key").on(table.email)]
);

export const componentDefinitions = pgTable(
  "component_definitions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    projectId: uuid("project_id").notNull(),
    name: varchar({ length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    description: text(),
    category: varchar({ length: 255 }).default("basic").notNull(),
    propsSchema: jsonb("props_schema").default({}).notNull(),
    renderTemplate: text("render_template").notNull(),
    cssStyles: text("css_styles"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_component_definitions_project").using(
      "btree",
      table.projectId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "component_definitions_project_id_fkey",
    }).onDelete("cascade"),
    unique("component_definitions_project_id_name_key").on(
      table.projectId,
      table.name
    ),
  ]
);

export const projects = pgTable(
  "projects",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ownerId: uuid("owner_id").notNull(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    requirements: text(),
  },
  (table) => [
    index("idx_projects_owner").using(
      "btree",
      table.ownerId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [users.id],
      name: "projects_owner_id_fkey",
    }),
  ]
);

export const pages = pgTable(
  "pages",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    projectId: uuid("project_id").notNull(),
    path: text().notNull(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    layoutJson: jsonb("layout_json").default({}).notNull(),
    isPublished: boolean("is_published").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_pages_project").using(
      "btree",
      table.projectId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "pages_project_id_fkey",
    }).onDelete("cascade"),
    unique("pages_project_id_path_key").on(table.projectId, table.path),
  ]
);

export const components = pgTable(
  "components",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    pageId: uuid("page_id").notNull(),
    componentDefinitionId: uuid("component_definition_id").notNull(),
    props: jsonb().default({}).notNull(),
    orderIndex: integer("order_index").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_components_definition").using(
      "btree",
      table.componentDefinitionId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_components_page_order").using(
      "btree",
      table.pageId.asc().nullsLast().op("int4_ops"),
      table.orderIndex.asc().nullsLast().op("int4_ops")
    ),
    foreignKey({
      columns: [table.componentDefinitionId],
      foreignColumns: [componentDefinitions.id],
      name: "components_component_definition_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.pageId],
      foreignColumns: [pages.id],
      name: "components_page_id_fkey",
    }).onDelete("cascade"),
  ]
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    sessionId: uuid("session_id").notNull(),
    messageType: text("message_type").notNull(),
    content: text().notNull(),
    metadata: jsonb().default({}),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    version: integer().default(1),
  },
  (table) => [
    index("idx_chat_messages_created_at").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops")
    ),
    index("idx_chat_messages_session_id").using(
      "btree",
      table.sessionId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [userSessions.id],
      name: "chat_messages_session_id_fkey",
    }).onDelete("cascade"),
    check(
      "chat_messages_message_type_check",
      sql`message_type = ANY (ARRAY['user'::text, 'assistant'::text])`
    ),
    check("check_metadata_json", sql`jsonb_typeof(metadata) = 'object'::text`),
  ]
);

export const chatSessionSummaries = pgTable(
  "chat_session_summaries",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    sessionId: uuid("session_id").notNull(),
    summary: text().notNull(),
    keyPoints: jsonb("key_points").default([]),
    lastMsgId: uuid("last_msg_id"),
    tokenCount: integer("token_count").default(0).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    version: integer().default(1),
  },
  (table) => [
    index("idx_chat_session_summaries_session_id").using(
      "btree",
      table.sessionId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_chat_session_summaries_last_msg").using(
      "btree",
      table.lastMsgId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [userSessions.id],
      name: "chat_session_summaries_session_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.lastMsgId],
      foreignColumns: [chatMessages.id],
      name: "chat_session_summaries_last_msg_id_fkey",
    }).onDelete("set null"),
    check(
      "check_key_points_json",
      sql`jsonb_typeof(key_points) = 'array'::text`
    ),
  ]
);
