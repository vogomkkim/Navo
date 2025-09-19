/**
 * @file Advanced rollback and recovery mechanisms for workflow execution
 */

import { PlanStep, ExecutionContext } from "../types";

export interface RollbackAction {
  stepId: string;
  action: "undo" | "cleanup" | "restore";
  data: any;
  timestamp: number;
}

export interface RecoveryStrategy {
  type: "retry" | "skip" | "rollback" | "manual";
  maxAttempts?: number;
  rollbackSteps?: string[];
  fallbackAction?: string;
}

export class RollbackManager {
  private rollbackActions: Map<string, RollbackAction[]> = new Map();
  private checkpointData: Map<string, any> = new Map();

  /**
   * Create a checkpoint before executing a step
   */
  createCheckpoint(stepId: string, data: any): void {
    this.checkpointData.set(stepId, {
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      timestamp: Date.now(),
    });
  }

  /**
   * Register a rollback action for a step
   */
  registerRollbackAction(
    stepId: string,
    action: Omit<RollbackAction, "stepId" | "timestamp">
  ): void {
    if (!this.rollbackActions.has(stepId)) {
      this.rollbackActions.set(stepId, []);
    }

    this.rollbackActions.get(stepId)!.push({
      stepId,
      timestamp: Date.now(),
      ...action,
    });
  }

  /**
   * Execute rollback for a specific step
   */
  async executeRollback(
    stepId: string,
    context: ExecutionContext
  ): Promise<boolean> {
    const actions = this.rollbackActions.get(stepId);
    if (!actions || actions.length === 0) {
      console.log(`[RollbackManager] No rollback actions for step ${stepId}`);
      return true;
    }

    console.log(
      `[RollbackManager] Executing rollback for step ${stepId} with ${actions.length} actions`
    );

    let success = true;
    for (const action of actions.reverse()) {
      // Execute in reverse order
      try {
        await this.executeRollbackAction(action, context);
      } catch (error) {
        console.error(
          `[RollbackManager] Rollback action failed for step ${stepId}:`,
          error
        );
        success = false;
      }
    }

    return success;
  }

  /**
   * Execute a specific rollback action
   */
  private async executeRollbackAction(
    action: RollbackAction,
    context: ExecutionContext
  ): Promise<void> {
    switch (action.action) {
      case "undo":
        await this.undoAction(action, context);
        break;
      case "cleanup":
        await this.cleanupAction(action, context);
        break;
      case "restore":
        await this.restoreAction(action, context);
        break;
      default:
        console.warn(
          `[RollbackManager] Unknown rollback action type: ${action.action}`
        );
    }
  }

  /**
   * Undo a specific action
   */
  private async undoAction(
    action: RollbackAction,
    context: ExecutionContext
  ): Promise<void> {
    const { data } = action;

    if (data.type === "file_created") {
      // Delete created file
      const fs = require("fs");
      if (fs.existsSync(data.path)) {
        fs.unlinkSync(data.path);
        console.log(`[RollbackManager] Deleted file: ${data.path}`);
      }
    } else if (data.type === "database_record") {
      // Delete database record
      // This would need to be implemented based on your database setup
      console.log(
        `[RollbackManager] Would delete database record: ${data.table}:${data.id}`
      );
    } else if (data.type === "vfs_file") {
      // Delete VFS file
      console.log(`[RollbackManager] Would delete VFS file: ${data.path}`);
    }
  }

  /**
   * Cleanup temporary resources
   */
  private async cleanupAction(
    action: RollbackAction,
    context: ExecutionContext
  ): Promise<void> {
    const { data } = action;

    if (data.type === "temp_files") {
      const fs = require("fs");
      data.files.forEach((filePath: string) => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[RollbackManager] Cleaned up temp file: ${filePath}`);
          }
        } catch (error) {
          console.error(
            `[RollbackManager] Failed to cleanup temp file ${filePath}:`,
            error
          );
        }
      });
    } else if (data.type === "processes") {
      // Kill spawned processes
      data.processes.forEach((pid: number) => {
        try {
          process.kill(pid, "SIGTERM");
          console.log(`[RollbackManager] Killed process: ${pid}`);
        } catch (error) {
          console.error(
            `[RollbackManager] Failed to kill process ${pid}:`,
            error
          );
        }
      });
    }
  }

  /**
   * Restore from checkpoint
   */
  private async restoreAction(
    action: RollbackAction,
    context: ExecutionContext
  ): Promise<void> {
    const { data } = action;
    const checkpoint = this.checkpointData.get(data.stepId);

    if (checkpoint) {
      // Restore data from checkpoint
      console.log(
        `[RollbackManager] Restoring checkpoint for step ${data.stepId}`
      );
      // Implementation would depend on what needs to be restored
    }
  }

  /**
   * Get recovery strategy for a failed step
   */
  getRecoveryStrategy(step: PlanStep, error: Error): RecoveryStrategy {
    // Default strategy
    let strategy: RecoveryStrategy = {
      type: "retry",
      maxAttempts: step.retryPolicy?.maxRetries || 3,
    };

    // Analyze error type to determine strategy
    if (
      error.message.includes("permission denied") ||
      error.message.includes("access denied")
    ) {
      strategy = { type: "manual", fallbackAction: "check_permissions" };
    } else if (
      error.message.includes("network") ||
      error.message.includes("timeout")
    ) {
      strategy = { type: "retry", maxAttempts: 5 };
    } else if (
      error.message.includes("not found") ||
      error.message.includes("missing")
    ) {
      strategy = { type: "skip", fallbackAction: "create_missing_resource" };
    } else if (
      error.message.includes("conflict") ||
      error.message.includes("already exists")
    ) {
      strategy = { type: "rollback", rollbackSteps: [step.id] };
    }

    return strategy;
  }

  /**
   * Execute recovery strategy
   */
  async executeRecovery(
    step: PlanStep,
    error: Error,
    context: ExecutionContext,
    executor: any
  ): Promise<{ success: boolean; shouldContinue: boolean }> {
    const strategy = this.getRecoveryStrategy(step, error);

    console.log(
      `[RollbackManager] Executing recovery strategy: ${strategy.type} for step ${step.id}`
    );

    switch (strategy.type) {
      case "retry":
        return { success: false, shouldContinue: true }; // Let retry logic handle this

      case "skip":
        console.log(`[RollbackManager] Skipping step ${step.id}`);
        return { success: true, shouldContinue: true };

      case "rollback":
        if (strategy.rollbackSteps) {
          for (const stepId of strategy.rollbackSteps) {
            await this.executeRollback(stepId, context);
          }
        }
        return { success: true, shouldContinue: false };

      case "manual":
        console.log(
          `[RollbackManager] Manual intervention required for step ${step.id}: ${strategy.fallbackAction}`
        );
        return { success: false, shouldContinue: false };

      default:
        return { success: false, shouldContinue: false };
    }
  }

  /**
   * Clear rollback data for completed steps
   */
  clearCompletedSteps(completedStepIds: string[]): void {
    completedStepIds.forEach((stepId) => {
      this.rollbackActions.delete(stepId);
      this.checkpointData.delete(stepId);
    });
  }

  /**
   * Get rollback summary
   */
  getRollbackSummary(): { totalActions: number; stepsWithRollback: number } {
    let totalActions = 0;
    let stepsWithRollback = 0;

    this.rollbackActions.forEach((actions, stepId) => {
      totalActions += actions.length;
      stepsWithRollback++;
    });

    return { totalActions, stepsWithRollback };
  }
}
