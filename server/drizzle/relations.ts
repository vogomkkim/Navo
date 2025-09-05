import { relations } from 'drizzle-orm/relations';
import {
  chatMessages,
  chatSessionSummaries,
  organizations,
  projects,
  users,
  usersToOrganizations,
  userSessions,
  vfsNodes,
  events,
  projectPlans,
  publishDeploys,
} from './schema';

// --- Core Multi-Tenant and User Relations ---

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  usersToOrganizations: many(usersToOrganizations),
  projects: many(projects),
}));

export const usersRelations = relations(users, ({ many }) => ({
  organizations: many(organizations),
  usersToOrganizations: many(usersToOrganizations),
  projects: many(projects), // Users can be associated with projects directly or indirectly
  chatMessages: many(chatMessages),
  events: many(events),
}));

export const usersToOrganizationsRelations = relations(usersToOrganizations, ({ one }) => ({
  user: one(users, {
    fields: [usersToOrganizations.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [usersToOrganizations.organizationId],
    references: [organizations.id],
  }),
}));

// --- Project and Content Relations ---

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  vfsNodes: many(vfsNodes),
  chatMessages: many(chatMessages),
  events: many(events),
  projectPlans: many(projectPlans),
  publishDeploys: many(publishDeploys),
}));

export const vfsNodesRelations = relations(vfsNodes, ({ one, many }) => ({
  project: one(projects, {
    fields: [vfsNodes.projectId],
    references: [projects.id],
  }),
  parent: one(vfsNodes, {
    fields: [vfsNodes.parentId],
    references: [vfsNodes.id],
    relationName: 'parent',
  }),
  children: many(vfsNodes, {
    relationName: 'parent',
  }),
}));

// --- User-Specific and Session Relations ---

export const userSessionsRelations = relations(userSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
  chatSessionSummaries: many(chatSessionSummaries),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  project: one(projects, {
    fields: [chatMessages.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export const chatSessionSummariesRelations = relations(
  chatSessionSummaries,
  ({ one }) => ({
    userSession: one(userSessions, {
      fields: [chatSessionSummaries.sessionId],
      references: [userSessions.id],
    }),
    lastMessage: one(chatMessages, {
      fields: [chatSessionSummaries.lastMsgId],
      references: [chatMessages.id],
    }),
  })
);

// --- Event and Plan Relations ---

export const eventsRelations = relations(events, ({ one }) => ({
  user: one(users, {
    fields: [events.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [events.projectId],
    references: [projects.id],
  }),
}));

export const projectPlansRelations = relations(projectPlans, ({ one }) => ({
  project: one(projects, {
    fields: [projectPlans.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectPlans.userId],
    references: [users.id],
  }),
}));

export const publishDeploysRelations = relations(publishDeploys, ({ one }) => ({
  project: one(projects, {
    fields: [publishDeploys.projectId],
    references: [projects.id],
  }),
}));
