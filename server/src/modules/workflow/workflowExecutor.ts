/**
 * @file Implements the WorkflowExecutor, the engine that runs declarative Plans.
 */

import { randomUUID } from 'node:crypto';

import { toolRegistry } from './toolRegistry';
import { ExecutionContext, Plan, PlanStep } from './types';
import { resolveInputs } from './utils/inputResolver';

export class WorkflowExecutor {
  async execute(
    app: any,
    plan: Plan,
    initialInputs: Record<string, any> = {},
  ): Promise<Map<string, any>> {
    if (!plan || !Array.isArray(plan.steps)) {
      throw new Error('Invalid plan: "steps" array is missing.');
    }

    const runId = randomUUID();
    console.log(`[Executor] Starting plan "${plan.name}" (Run ID: ${runId})`);

    const executionContext: ExecutionContext = { runId, app };
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
      throw new Error(`Workflow stalled. Circular dependency detected. Remaining: ${remaining.join(', ')}`);
    }

    console.log(`[Executor] Plan "${plan.name}" executed successfully.`);
    return stepOutputs;
  }

  private async executeStep(
    step: PlanStep,
    context: ExecutionContext,
    allOutputs: Map<string, any>,
  ): Promise<any> {
    console.log(`[Executor] Executing step: ${step.id}`);
    const tool = toolRegistry.get(step.tool);
    if (!tool) {
      throw new Error(`Tool "${step.tool}" not found for step "${step.id}".`);
    }

    const resolvedInputs = resolveInputs(step.inputs, allOutputs);

    try {
      const output = await tool.execute(context, resolvedInputs);
      console.log(`[Executor] Step ${step.id} completed.`);
      return output;
    } catch (error) {
      console.error(`[Executor] Error in step ${step.id}:`, error);
      throw error;
    }
  }
}
