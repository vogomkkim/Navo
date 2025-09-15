/**
 * @file Implements the WorkflowExecutor, the engine that runs declarative Plans.
 */

import { randomUUID } from 'crypto';

import { toolRegistry } from './toolRegistry';
import { ExecutionContext, Plan, PlanStep } from './types';
import { resolveInputs } from './utils/inputResolver';
import { connectionManager } from './workflow.controller';

export class WorkflowExecutor {
  async execute(
    app: any,
    plan: Plan,
    initialInputs: Record<string, any> = {},
    contextExtras: Partial<ExecutionContext> = {},
  ): Promise<Map<string, any>> {
    if (!plan || !Array.isArray(plan.steps)) {
      throw new Error('Invalid plan: "steps" array is missing.');
    }

    const runId = randomUUID();
    const projectId = contextExtras.projectId;
    console.log(`[Executor] Starting plan "${plan.name}" (Run ID: ${runId})`);

    if (projectId) {
      connectionManager.broadcast(projectId, {
        type: 'workflow_started',
        payload: { planName: plan.name, runId },
      });
    }

    const executionContext: ExecutionContext = { runId, app, ...contextExtras };
    const stepOutputs = new Map<string, any>();
    const completedSteps = new Set<string>();

    let executedInLoop = true;
    while (completedSteps.size < plan.steps.length && executedInLoop) {
      executedInLoop = false;
      const stepsToRun = plan.steps.filter(
        (step) =>
          !completedSteps.has(step.id) &&
          (step.dependencies ?? []).every((dep) => completedSteps.has(dep)),
      );

      if (stepsToRun.length > 0) {
        for (const step of stepsToRun) {
          const output = await this.executeStep(
            step,
            executionContext,
            stepOutputs,
          );
          stepOutputs.set(step.id, output);
          completedSteps.add(step.id);
          executedInLoop = true;
        }
      }
    }

    if (completedSteps.size < plan.steps.length) {
      const remaining = plan.steps.filter(s => !completedSteps.has(s.id)).map(s => s.id);
      const error = new Error(`Workflow stalled. Circular dependency detected. Remaining: ${remaining.join(', ')}`);
      if (projectId) {
        connectionManager.broadcast(projectId, {
          type: 'workflow_failed',
          payload: { planName: plan.name, runId, error: error.message },
        });
      }
      throw error;
    }

    console.log(`[Executor] Plan "${plan.name}" executed successfully.`);
    if (projectId) {
      connectionManager.broadcast(projectId, {
        type: 'workflow_completed',
        payload: { planName: plan.name, runId, outputs: Object.fromEntries(stepOutputs) },
      });
    }
    return stepOutputs;
  }

  private async executeStep(
    step: PlanStep,
    context: ExecutionContext,
    allOutputs: Map<string, any>,
  ): Promise<any> {
    console.log(`[Executor] Executing step: ${step.id}`);
    const projectId = context.projectId;

    if (projectId) {
      connectionManager.broadcast(projectId, {
        type: 'workflow_progress',
        payload: { stepId: step.id, status: 'running' },
      });
    }

    const tool = toolRegistry.get(step.tool);
    if (!tool) {
      const error = new Error(`Tool "${step.tool}" not found for step "${step.id}".`);
      if (projectId) {
        connectionManager.broadcast(projectId, {
          type: 'workflow_progress',
          payload: { stepId: step.id, status: 'failed', error: error.message },
        });
      }
      throw error;
    }

    const resolvedInputs = resolveInputs(step.inputs, allOutputs);

    // Automatically inject context into the inputs for every tool
    const inputsWithContext = {
      ...resolvedInputs,
      projectId: context.projectId,
      userId: context.userId,
    };

    try {
      const output = await tool.execute(context, inputsWithContext);
      console.log(`[Executor] Step ${step.id} completed.`);
      if (projectId) {
        connectionManager.broadcast(projectId, {
          type: 'workflow_progress',
          payload: { stepId: step.id, status: 'completed', output },
        });
      }
      return output;
    } catch (error) {
      console.error(`[Executor] Error in step ${step.id}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (projectId) {
        connectionManager.broadcast(projectId, {
          type: 'workflow_progress',
          payload: { stepId: step.id, status: 'failed', error: errorMessage },
        });
      }
      throw error;
    }
  }
}
