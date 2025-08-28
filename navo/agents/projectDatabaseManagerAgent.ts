import { db } from '../db/db.js';
import { drafts } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { BaseAgent } from '../core/masterDeveloper.js';
import { randomUUID as uuidv4 } from 'node:crypto';

export class ProjectDatabaseManagerAgent extends BaseAgent {
  constructor() {
    super('ProjectDatabaseManagerAgent', 4); // Lower priority, as it's a utility agent
  }

  canHandle(request: any): boolean {
    // This agent is not directly triggered by user requests, but by other agents.
    return false;
  }

  async execute(request: any, context: any): Promise<any> {
    // This agent is not meant to be executed directly in the main loop.
    // It provides utility methods for other agents.
    throw new Error('ProjectDatabaseManagerAgent cannot be executed directly.');
  }

  /**
   * Saves a new project draft to the database.
   * @param projectId The ID of the project this draft belongs to.
   * @param draftName A descriptive name for the draft.
   * @param projectData The complete virtual project JSON object.
   * @returns The newly created draft object.
   */
  async saveDraft(
    projectId: string,
    draftName: string,
    projectData: object
  ): Promise<any> {
    try {
      this.logger.info(`🗄️ Saving project draft "${draftName}" for project ${projectId}`);
      
      const newDraft = {
        id: uuidv4(),
        projectId,
        name: draftName,
        data: projectData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.insert(drafts).values(newDraft).returning();
      
      this.logger.info(`✅ Draft saved successfully with ID: ${result[0].id}`);
      return result[0];
    } catch (error) {
      this.logger.error('❌ Failed to save project draft to database', {
        error: error instanceof Error ? error.message : String(error),
        projectId,
      });
      throw new Error(`Database save failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves a project draft from the database.
   * @param draftId The ID of the draft to retrieve.
   * @returns The draft object, or null if not found.
   */
  async getDraft(draftId: string): Promise<any | null> {
    try {
      this.logger.info(`🔍 Retrieving project draft with ID: ${draftId}`);
      
      const result = await db.select().from(drafts).where(eq(drafts.id, draftId));

      if (result.length === 0) {
        this.logger.warn(`⚠️ Draft with ID ${draftId} not found.`);
        return null;
      }

      this.logger.info(`✅ Draft ${draftId} retrieved successfully.`);
      return result[0];
    } catch (error) {
      this.logger.error('❌ Failed to retrieve project draft from database', {
        error: error instanceof Error ? error.message : String(error),
        draftId,
      });
      throw new Error(`Database retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
