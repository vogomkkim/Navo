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
    order: integer("order").notNull().default(0),
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
