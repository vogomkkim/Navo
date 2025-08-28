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
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  password: text('password').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    ownerIdx: index('idx_projects_owner').on(table.ownerId),
  })
);

export const suggestions = pgTable('suggestions', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  content: jsonb('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true, mode: 'date' }),
});

export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull(),
  kind: varchar('kind', { length: 255 }).notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

export const components = pgTable(
  'components',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pageId: uuid('page_id').notNull(),
    type: varchar('type', { length: 255 }).notNull(),
    props: jsonb('props').notNull().default({}),
    orderIndex: integer('order_index').notNull().default(0),
  },
  (table) => ({
    pageOrderIdx: index('idx_components_page_order').on(
      table.pageId,
      table.orderIndex
    ),
  })
);

export const events = pgTable(
  'events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    projectId: uuid('project_id'),
    userId: uuid('user_id'),
    type: varchar('type', { length: 255 }).notNull(),
    data: jsonb('data'),
    ts: timestamp('ts', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectTsIdx: index('idx_events_project_ts').on(table.projectId, table.ts),
  })
);

export const pages = pgTable(
  'pages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').notNull(),
    path: text('path').notNull(),
    layoutJson: jsonb('layout_json').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectPathUnique: unique('pages_project_id_path_unique').on(
      table.projectId,
      table.path
    ),
  })
);

export const publishDeploys = pgTable('publish_deploys', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull(),
  url: text('url').notNull(),
  status: varchar('status', { length: 255 }).notNull(),
  vercelDeploymentId: varchar('vercel_deployment_id', { length: 255 }).unique(), // Added column
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

export const drafts = pgTable(
  'drafts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    data: jsonb('data').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectIdx: index('idx_drafts_project').on(table.projectId),
  })
);

export const componentDefinitions = pgTable('component_definitions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 255 }).notNull().default('basic'),
  propsSchema: jsonb('props_schema').notNull().default({}),
  renderTemplate: text('render_template').notNull(),
  cssStyles: text('css_styles'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

// Drafts table for saving virtual project states/snapshots
export const drafts = pgTable('drafts', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  data: jsonb('data').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});
