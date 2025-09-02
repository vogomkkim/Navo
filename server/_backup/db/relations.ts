import { relations } from 'drizzle-orm/relations';
import {
  projects,
  componentDefinitions,
  users,
  pages,
  components,
  userSessions,
  chatMessages,
  chatSessionSummaries,
} from './schema';

export const componentDefinitionsRelations = relations(
  componentDefinitions,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [componentDefinitions.projectId],
      references: [projects.id],
    }),
    components: many(components),
  })
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  componentDefinitions: many(componentDefinitions),
  user: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  pages: many(pages),
}));

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  project: one(projects, {
    fields: [pages.projectId],
    references: [projects.id],
  }),
  components: many(components),
}));

export const componentsRelations = relations(components, ({ one }) => ({
  componentDefinition: one(componentDefinitions, {
    fields: [components.componentDefinitionId],
    references: [componentDefinitions.id],
  }),
  page: one(pages, {
    fields: [components.pageId],
    references: [pages.id],
  }),
}));

export const chatMessagesRelations = relations(
  chatMessages,
  ({ one, many }) => ({
    userSession: one(userSessions, {
      fields: [chatMessages.sessionId],
      references: [userSessions.id],
    }),
    chatSessionSummaries: many(chatSessionSummaries),
  })
);

export const userSessionsRelations = relations(userSessions, ({ many }) => ({
  chatMessages: many(chatMessages),
  chatSessionSummaries: many(chatSessionSummaries),
}));

export const chatSessionSummariesRelations = relations(
  chatSessionSummaries,
  ({ one }) => ({
    chatMessage: one(chatMessages, {
      fields: [chatSessionSummaries.lastMsgId],
      references: [chatMessages.id],
    }),
    userSession: one(userSessions, {
      fields: [chatSessionSummaries.sessionId],
      references: [userSessions.id],
    }),
  })
);
