import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

// --- Core Multi-Tenant and User Tables ---

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
});

export const users = pgTable(
  'users',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    email: varchar({ length: 255 }).notNull(),
    name: varchar({ length: 255 }),
    password: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique('users_email_key').on(table.email)]
);

// Junction table for many-to-many relationship between users and organizations
export const usersToOrganizations = pgTable(
  'users_to_organizations',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.organizationId] }),
  })
);

// --- Project and Content Tables (Now Tenant-Aware) ---

export const projects = pgTable(
  'projects',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid('organization_id') // Changed from ownerId
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    requirements: text(),
  },
  (table) => [
    index('idx_projects_organization').using(
      'btree',
      table.organizationId.asc().nullsLast().op('uuid_ops')
    ),
  ]
);

export const vfsNodes = pgTable(
  'vfs_nodes',
  {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => vfsNodes.id, { // Use AnyPgColumn for self-reference
      onDelete: 'cascade',
    }),
    nodeType: varchar('node_type', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    content: text('content'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectIdx: index('idx_vfs_nodes_project').using('btree', table.projectId),
    parentIdx: index('idx_vfs_nodes_parent').using('btree', table.parentId),
    uniqueName: unique('vfs_nodes_project_id_parent_id_name_key').on(
      table.projectId,
      table.parentId,
      table.name
    ),
    nodeTypeCheck: check('check_node_type', sql`node_type IN ('FILE', 'DIRECTORY')`),
    contentCheck: check(
      'check_content_for_file',
      sql`(node_type = 'DIRECTORY' AND content IS NULL) OR (node_type = 'FILE')`
    ),
  })
);

// --- User-Specific and Session Tables (Not directly tenant-aware) ---

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    sessionData: jsonb('session_data').default({}).notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'string',
    }).defaultNow(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'string',
    }).defaultNow(),
    version: integer().default(1),
    lastActivity: timestamp('last_activity', {
      withTimezone: true,
      mode: 'string',
    })
      .defaultNow()
      .notNull(),
    status: varchar({ length: 50 }).default('active').notNull(),
  },
  (table) => [
    index('idx_user_sessions_created_at').using(
      'btree',
      table.createdAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_user_sessions_last_activity').using(
      'btree',
      table.lastActivity.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_user_sessions_status').using(
      'btree',
      table.status.asc().nullsLast().op('text_ops')
    ),
    index('idx_user_sessions_user_id').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    ),
    check(
      'check_session_data_json',
      sql`jsonb_typeof(session_data) = 'object'::text`
    ),
  ]
);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 50 }).notNull(), // 'user' or AI role
    content: text('content').notNull(),
    payload: jsonb('payload'), // For AI messages with extra data
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_chat_messages_project').using('btree', table.projectId),
    index('idx_chat_messages_created_at').using('btree', table.createdAt),
  ]
);

// --- Deprecated Agent Tables (To be removed or refactored) ---

export const projectPlans = pgTable(
  'project_plans',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    projectId: uuid('project_id').notNull(),
    userId: uuid('user_id').notNull(),
    planData: jsonb('plan_data').notNull(),
    context: jsonb('context').default({}).notNull(),
    status: varchar({ length: 50 }).default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_project_plans_project').using(
      'btree',
      table.projectId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_project_plans_user').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_project_plans_status').using(
      'btree',
      table.status.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'project_plans_project_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'project_plans_user_id_fkey',
    }),
  ]
);

export const chatSessionSummaries = pgTable(
  'chat_session_summaries',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    sessionId: uuid('session_id').notNull(),
    summary: text().notNull(),
    keyPoints: jsonb('key_points').default([]),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'string',
    }).defaultNow(),
    version: integer().default(1),
    lastMsgId: uuid('last_msg_id'),
    tokenCount: integer('token_count').default(0).notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'string',
    }).defaultNow(),
  },
  (table) => [
    index('idx_chat_session_summaries_last_msg').using(
      'btree',
      table.lastMsgId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_chat_session_summaries_session_id').using(
      'btree',
      table.sessionId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.lastMsgId],
      foreignColumns: [chatMessages.id],
      name: 'chat_session_summaries_last_msg_id_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [userSessions.id],
      name: 'chat_session_summaries_session_id_fkey',
    }).onDelete('cascade'),
    check(
      'check_key_points_json',
      sql`jsonb_typeof(key_points) = 'array'::text`
    ),
  ]
);

export const events = pgTable(
  'events',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    projectId: uuid('project_id'),
    eventType: varchar({ length: 100 }).notNull(),
    eventData: jsonb('event_data').default({}),
    metadata: jsonb('metadata').default({}),
    timestamp: timestamp('timestamp', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_events_user_id').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_events_project_id').using(
      'btree',
      table.projectId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_events_event_type').using(
      'btree',
      table.eventType.asc().nullsLast().op('text_ops')
    ),
    index('idx_events_timestamp').using(
      'btree',
      table.timestamp.asc().nullsLast().op('timestamptz_ops')
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'events_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'events_project_id_fkey',
    }).onDelete('cascade'),
  ]
);

export const publishDeploys = pgTable(
  'publish_deploys',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    projectId: uuid('project_id').notNull(),
    status: varchar({ length: 50 }).default('pending').notNull(),
    deployUrl: text('deploy_url'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_publish_deploys_project_id').using(
      'btree',
      table.projectId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_publish_deploys_status').using(
      'btree',
      table.status.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'publish_deploys_project_id_fkey',
    }).onDelete('cascade'),
  ]
);
