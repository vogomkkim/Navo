/**
 * @file Implements the WorkflowExecutor, the engine that runs declarative Plans.
 */

import { randomUUID } from "crypto";

import { toolRegistry } from "./toolRegistry";
import { ExecutionContext, Plan, PlanStep } from "./types";
import { resolveInputs } from "./utils/inputResolver";
import { connectionManager } from "./workflow.controller";
import {
  DependencyAnalyzer,
  DependencyAnalysis,
} from "./utils/dependencyAnalyzer";
import { RollbackManager } from "./utils/rollbackManager";
import { PerformanceMonitor } from "./utils/performanceMonitor";

export class WorkflowExecutor {
  async execute(
    app: any,
    plan: Plan,
    initialInputs: Record<string, any> = {},
    contextExtras: Partial<ExecutionContext> = {}
  ): Promise<Map<string, any>> {
    if (!plan || !Array.isArray(plan.steps)) {
      throw new Error('Invalid plan: "steps" array is missing.');
    }

    const runId = randomUUID();
    const projectId = contextExtras.projectId;

    // Analyze dependencies and validate plan
    const analysis = DependencyAnalyzer.analyze(plan);
    const validation = DependencyAnalyzer.validatePlan(plan);

    if (!validation.isValid) {
      const error = new Error(
        `Plan validation failed: ${validation.issues.join(", ")}`
      );
      console.error(`[Executor] Plan validation failed:`, validation.issues);
      if (projectId) {
        connectionManager.broadcast(projectId, {
          type: "workflow_failed",
          payload: { planName: plan.name, runId, error: error.message },
        });
      }
      throw error;
    }

    console.log(
      `[Executor] Starting enhanced plan "${plan.name}" (Run ID: ${runId})`
    );
    console.log(`[Executor] Plan metadata:`, {
      estimatedDuration: plan.estimatedDuration,
      parallelizable: plan.parallelizable,
      complexity: plan.metadata?.complexity,
      stepCount: plan.steps.length,
      analysisDuration: analysis.estimatedDuration,
      executionLevels: analysis.levels.length,
      criticalPath: analysis.criticalPath,
    });

    if (projectId) {
      connectionManager.broadcast(projectId, {
        type: "workflow_started",
        payload: {
          planName: plan.name,
          runId,
          estimatedDuration: plan.estimatedDuration,
          parallelizable: plan.parallelizable,
          stepCount: plan.steps.length,
        },
      });
    }

    const executionContext: ExecutionContext = { runId, app, ...contextExtras };
    const stepOutputs = new Map<string, any>();
    const completedSteps = new Set<string>();
    const failedSteps = new Set<string>();
    const stepStartTimes = new Map<string, number>();
    const rollbackManager = new RollbackManager();
    const performanceMonitor = new PerformanceMonitor();

    // Start performance monitoring
    performanceMonitor.startMonitoring();

    // Use optimized execution levels from dependency analysis
    const optimizedLevels = DependencyAnalyzer.optimizeExecutionOrder(analysis);

    console.log(
      `[Executor] Executing plan in ${optimizedLevels.length} levels`
    );

    for (
      let levelIndex = 0;
      levelIndex < optimizedLevels.length;
      levelIndex++
    ) {
      const level = optimizedLevels[levelIndex];
      const levelStartTime = Date.now();
      console.log(
        `[Executor] Executing level ${level.level} with ${level.steps.length} steps`
      );

      if (level.canRunInParallel && level.steps.length > 1) {
        // Execute steps in parallel
        console.log(
          `[Executor] Executing ${level.steps.length} steps in parallel at level ${level.level}`
        );

        const parallelPromises = level.steps.map(async (step) => {
          // Check conditional execution
          if (step.conditional) {
            try {
              const conditionResult = this.evaluateCondition(
                step.conditional,
                stepOutputs
              );
              if (!conditionResult) {
                console.log(
                  `[Executor] Step ${step.id} skipped due to condition: ${step.conditional}`
                );
                return { stepId: step.id, skipped: true };
              }
            } catch (error) {
              console.error(
                `[Executor] Error evaluating condition for step ${step.id}:`,
                error
              );
              throw error;
            }
          }

          return this.executeStepWithRetry(
            step,
            executionContext,
            stepOutputs,
            stepStartTimes,
            rollbackManager,
            performanceMonitor
          )
            .then((output) => ({ stepId: step.id, output }))
            .catch((error) => ({ stepId: step.id, error }));
        });

        const results = await Promise.all(parallelPromises);

        results.forEach((result) => {
          if ("skipped" in result) {
            completedSteps.add(result.stepId);
          } else if ("error" in result) {
            console.error(
              `[Executor] Step ${result.stepId} failed:`,
              result.error
            );
            failedSteps.add(result.stepId);
          } else {
            stepOutputs.set(result.stepId, result.output);
            completedSteps.add(result.stepId);
          }
        });
      } else {
        // Execute steps sequentially
        for (const step of level.steps) {
          // Check conditional execution
          if (step.conditional) {
            try {
              const conditionResult = this.evaluateCondition(
                step.conditional,
                stepOutputs
              );
              if (!conditionResult) {
                console.log(
                  `[Executor] Step ${step.id} skipped due to condition: ${step.conditional}`
                );
                completedSteps.add(step.id);
                continue;
              }
            } catch (error) {
              console.error(
                `[Executor] Error evaluating condition for step ${step.id}:`,
                error
              );
              failedSteps.add(step.id);
              continue;
            }
          }

          try {
            const output = await this.executeStepWithRetry(
              step,
              executionContext,
              stepOutputs,
              stepStartTimes,
              rollbackManager,
              performanceMonitor
            );
            stepOutputs.set(step.id, output);
            completedSteps.add(step.id);
          } catch (error) {
            console.error(`[Executor] Step ${step.id} failed:`, error);
            failedSteps.add(step.id);
          }
        }
      }

      // Record level performance metrics
      const levelExecutionTime = Date.now() - levelStartTime;
      const parallelSteps = level.canRunInParallel ? level.steps.length : 0;
      const sequentialSteps = level.canRunInParallel ? 0 : level.steps.length;

      performanceMonitor.recordLevelExecution(
        level.level,
        levelExecutionTime,
        parallelSteps,
        sequentialSteps
      );

      // Broadcast level completion
      if (projectId) {
        connectionManager.broadcast(projectId, {
          type: "workflow_level_completed",
          payload: {
            level: level.level,
            completedSteps: level.steps.map((s) => s.id),
            totalLevels: optimizedLevels.length,
            executionTime: levelExecutionTime,
            efficiency: level.canRunInParallel
              ? parallelSteps / level.steps.length
              : 0,
          },
        });
      }
    }

    if (completedSteps.size < plan.steps.length) {
      const remaining = plan.steps
        .filter((s) => !completedSteps.has(s.id))
        .map((s) => s.id);
      const error = new Error(
        `Workflow stalled. Circular dependency detected. Remaining: ${remaining.join(
          ", "
        )}`
      );
      if (projectId) {
        connectionManager.broadcast(projectId, {
          type: "workflow_failed",
          payload: { planName: plan.name, runId, error: error.message },
        });
      }
      throw error;
    }

    // Generate and log performance metrics
    const performanceMetrics = performanceMonitor.generateMetrics();
    console.log(`[Executor] Plan "${plan.name}" executed successfully.`);
    console.log(performanceMonitor.getPerformanceSummary());

    if (performanceMetrics.optimizationSuggestions.length > 0) {
      console.log(
        `[Executor] Optimization suggestions:`,
        performanceMetrics.optimizationSuggestions
      );
    }

    if (projectId) {
      connectionManager.broadcast(projectId, {
        type: "workflow_completed",
        payload: {
          planName: plan.name,
          runId,
          outputs: Object.fromEntries(stepOutputs),
          performanceMetrics: {
            totalExecutionTime: performanceMetrics.totalExecutionTime,
            peakMemoryUsage: performanceMetrics.resourceUsage.peakMemoryUsage,
            optimizationSuggestions: performanceMetrics.optimizationSuggestions,
          },
        },
      });
    }

    return stepOutputs;
  }

  private async executeStep(
    step: PlanStep,
    context: ExecutionContext,
    allOutputs: Map<string, any>
  ): Promise<any> {
    console.log(`[Executor] Executing step: ${step.id}`);
    const projectId = context.projectId;

    if (projectId) {
      connectionManager.broadcast(projectId, {
        type: "workflow_progress",
        payload: { stepId: step.id, status: "running" },
      });
    }

    const tool = toolRegistry.get(step.tool);
    if (!tool) {
      const error = new Error(
        `Tool "${step.tool}" not found for step "${step.id}".`
      );
      if (projectId) {
        connectionManager.broadcast(projectId, {
          type: "workflow_progress",
          payload: { stepId: step.id, status: "failed", error: error.message },
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
          type: "workflow_progress",
          payload: { stepId: step.id, status: "completed", output },
        });
      }
      return output;
    } catch (error) {
      console.error(`[Executor] Error in step ${step.id}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (projectId) {
        connectionManager.broadcast(projectId, {
          type: "workflow_progress",
          payload: { stepId: step.id, status: "failed", error: errorMessage },
        });
      }
      throw error;
    }
  }

  /**
   * Execute a step with retry policy and enhanced error handling
   */
  private async executeStepWithRetry(
    step: PlanStep,
    context: ExecutionContext,
    allOutputs: Map<string, any>,
    stepStartTimes: Map<string, number>,
    rollbackManager?: RollbackManager,
    performanceMonitor?: PerformanceMonitor
  ): Promise<any> {
    const startTime = Date.now();
    stepStartTimes.set(step.id, startTime);

    console.log(`[Executor] Executing step: ${step.id} (${step.title})`);
    const projectId = context.projectId;

    if (projectId) {
      connectionManager.broadcast(projectId, {
        type: "workflow_progress",
        payload: {
          stepId: step.id,
          status: "running",
          title: step.title,
          description: step.description,
          estimatedDuration: step.estimatedDuration,
        },
      });
    }

    const retryPolicy = step.retryPolicy || { maxRetries: 0, backoff: "fixed" };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        // Create checkpoint before execution
        if (rollbackManager) {
          rollbackManager.createCheckpoint(step.id, allOutputs);
        }

        const output = await this.executeStep(step, context, allOutputs);

        const duration = Date.now() - startTime;
        console.log(`[Executor] Step ${step.id} completed in ${duration}ms`);

        // Record performance metrics
        if (performanceMonitor) {
          performanceMonitor.recordStepExecution(step, duration, attempt, true);
        }

        if (projectId) {
          connectionManager.broadcast(projectId, {
            type: "workflow_progress",
            payload: {
              stepId: step.id,
              status: "completed",
              duration,
              output: output,
            },
          });
        }

        return output;
      } catch (error) {
        lastError = error as Error;
        console.error(
          `[Executor] Step ${step.id} attempt ${attempt + 1} failed:`,
          error
        );

        // Execute recovery strategy if available
        if (rollbackManager && attempt === retryPolicy.maxRetries) {
          const recovery = await rollbackManager.executeRecovery(
            step,
            lastError,
            context,
            this
          );
          if (recovery.success) {
            console.log(`[Executor] Recovery successful for step ${step.id}`);
            return null; // Step was handled by recovery
          } else if (!recovery.shouldContinue) {
            console.log(
              `[Executor] Recovery failed and workflow should stop for step ${step.id}`
            );
            throw lastError;
          }
        }

        if (attempt < retryPolicy.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt, retryPolicy);
          console.log(`[Executor] Retrying step ${step.id} in ${delay}ms`);

          if (projectId) {
            connectionManager.broadcast(projectId, {
              type: "workflow_progress",
              payload: {
                stepId: step.id,
                status: "retrying",
                attempt: attempt + 1,
                maxRetries: retryPolicy.maxRetries,
                delay,
              },
            });
          }

          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    console.error(
      `[Executor] Step ${step.id} failed after ${
        retryPolicy.maxRetries + 1
      } attempts`
    );

    // Record failed step metrics
    if (performanceMonitor) {
      const duration = Date.now() - startTime;
      performanceMonitor.recordStepExecution(
        step,
        duration,
        retryPolicy.maxRetries,
        false,
        lastError?.message
      );
    }

    if (projectId) {
      connectionManager.broadcast(projectId, {
        type: "workflow_progress",
        payload: {
          stepId: step.id,
          status: "failed",
          error: lastError?.message,
        },
      });
    }

    throw lastError;
  }

  /**
   * Evaluate conditional expression for step execution
   */
  private evaluateCondition(
    condition: string,
    stepOutputs: Map<string, any>
  ): boolean {
    try {
      // Create a safe evaluation context
      const context = {
        steps: Object.fromEntries(stepOutputs),
      };

      // Simple condition evaluation (can be enhanced with a proper expression parser)
      // For now, support basic comparisons like "${steps.stepId.outputs.success} === true"
      const expression = condition.replace(/\$\{([^}]+)\}/g, (match, path) => {
        const parts = path.split(".");
        let value: any = context;
        for (const part of parts) {
          value = value[part];
          if (value === undefined) return "undefined";
        }
        return JSON.stringify(value);
      });

      // Use Function constructor for safe evaluation (in production, use a proper expression parser)
      return new Function("return " + expression)();
    } catch (error) {
      console.error(
        `[Executor] Error evaluating condition "${condition}":`,
        error
      );
      return false;
    }
  }

  /**
   * Calculate backoff delay based on policy
   */
  private calculateBackoffDelay(attempt: number, policy: any): number {
    const initialDelay = policy.initialDelay || 1000;
    const maxDelay = policy.maxDelay || 30000;

    switch (policy.backoff) {
      case "exponential":
        return Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      case "linear":
        return Math.min(initialDelay * (attempt + 1), maxDelay);
      case "fixed":
      default:
        return initialDelay;
    }
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
