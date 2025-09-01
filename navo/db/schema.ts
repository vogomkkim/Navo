import {
  pgTable,
  index,
  check,
  uuid,
  jsonb,
  timestamp,
  integer,
  varchar,
  unique,
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
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    version: integer().default(1),
    lastActivity: timestamp("last_activity", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    status: varchar({ length: 50 }).default("active").notNull(),
  },
  (table) => [
    index("idx_user_sessions_created_at").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops")
    ),
    index("idx_user_sessions_last_activity").using(
      "btree",
      table.lastActivity.asc().nullsLast().op("timestamptz_ops")
    ),
    index("idx_user_sessions_status").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops")
    ),
    index("idx_user_sessions_user_id").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
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
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    version: integer().default(1),
    lastMsgId: uuid("last_msg_id"),
    tokenCount: integer("token_count").default(0).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
  },
  (table) => [
    index("idx_chat_session_summaries_last_msg").using(
      "btree",
      table.lastMsgId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_chat_session_summaries_session_id").using(
      "btree",
      table.sessionId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.lastMsgId],
      foreignColumns: [chatMessages.id],
      name: "chat_session_summaries_last_msg_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [userSessions.id],
      name: "chat_session_summaries_session_id_fkey",
    }).onDelete("cascade"),
    check(
      "check_key_points_json",
      sql`jsonb_typeof(key_points) = 'array'::text`
    ),
  ]
);

export const events = pgTable(
  "events",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    sessionId: uuid("session_id"),
    projectId: uuid("project_id"),
    eventType: varchar({ length: 100 }).notNull(),
    eventData: jsonb("event_data").default({}).notNull(),
    metadata: jsonb("metadata").default({}),
    timestamp: timestamp("timestamp", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_events_user_id").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_events_session_id").using(
      "btree",
      table.sessionId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_events_project_id").using(
      "btree",
      table.projectId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_events_event_type").using(
      "btree",
      table.eventType.asc().nullsLast().op("text_ops")
    ),
    index("idx_events_timestamp").using(
      "btree",
      table.timestamp.asc().nullsLast().op("timestamptz_ops")
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "events_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [userSessions.id],
      name: "events_session_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "events_project_id_fkey",
    }).onDelete("cascade"),
    check(
      "check_event_data_json",
      sql`jsonb_typeof(event_data) = 'object'::text`
    ),
    check("check_metadata_json", sql`jsonb_typeof(metadata) = 'object'::text`),
  ]
);

export const publishDeploys = pgTable(
  "publish_deploys",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    projectId: uuid("project_id").notNull(),
    version: varchar({ length: 50 }).notNull(),
    status: varchar({ length: 20 }).default("pending").notNull(),
    deployUrl: text(),
    environment: varchar({ length: 20 }).default("production").notNull(),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deployedAt: timestamp("deployed_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    index("idx_publish_deploys_project_id").using(
      "btree",
      table.projectId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_publish_deploys_status").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops")
    ),
    index("idx_publish_deploys_created_at").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops")
    ),
    index("idx_publish_deploys_version").using(
      "btree",
      table.version.asc().nullsLast().op("text_ops")
    ),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "publish_deploys_project_id_fkey",
    }).onDelete("cascade"),
    check("check_metadata_json", sql`jsonb_typeof(metadata) = 'object'::text`),
  ]
);
