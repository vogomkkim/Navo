/**
 * @file Advanced dependency analysis and optimization utilities for workflow execution
 */

import { Plan, PlanStep } from "../types";

export interface DependencyGraph {
  nodes: Map<string, PlanStep>;
  edges: Map<string, string[]>;
  reverseEdges: Map<string, string[]>;
}

export interface ExecutionLevel {
  level: number;
  steps: PlanStep[];
  canRunInParallel: boolean;
}

export interface DependencyAnalysis {
  graph: DependencyGraph;
  levels: ExecutionLevel[];
  criticalPath: string[];
  estimatedDuration: number;
  parallelizable: boolean;
  circularDependencies: string[][];
}

export class DependencyAnalyzer {
  /**
   * Analyze the dependency graph and create execution levels
   */
  static analyze(plan: Plan): DependencyAnalysis {
    const graph = this.buildDependencyGraph(plan.steps);
    const levels = this.createExecutionLevels(graph);
    const criticalPath = this.findCriticalPath(graph, plan.steps);
    const circularDeps = this.detectCircularDependencies(graph);

    return {
      graph,
      levels,
      criticalPath,
      estimatedDuration: this.calculateEstimatedDuration(levels),
      parallelizable: levels.some((level) => level.steps.length > 1),
      circularDependencies: circularDeps,
    };
  }

  /**
   * Build a dependency graph from plan steps
   */
  private static buildDependencyGraph(steps: PlanStep[]): DependencyGraph {
    const nodes = new Map<string, PlanStep>();
    const edges = new Map<string, string[]>();
    const reverseEdges = new Map<string, string[]>();

    // Initialize nodes
    steps.forEach((step) => {
      nodes.set(step.id, step);
      edges.set(step.id, []);
      reverseEdges.set(step.id, []);
    });

    // Build edges
    steps.forEach((step) => {
      if (step.dependencies) {
        step.dependencies.forEach((depId) => {
          if (nodes.has(depId)) {
            edges.get(depId)!.push(step.id);
            reverseEdges.get(step.id)!.push(depId);
          }
        });
      }
    });

    return { nodes, edges, reverseEdges };
  }

  /**
   * Create execution levels (topological sort with parallelization)
   */
  private static createExecutionLevels(
    graph: DependencyGraph
  ): ExecutionLevel[] {
    const levels: ExecutionLevel[] = [];
    const visited = new Set<string>();
    const inProgress = new Set<string>();

    // Find root nodes (no dependencies)
    const rootNodes = Array.from(graph.nodes.keys()).filter(
      (nodeId) => graph.reverseEdges.get(nodeId)!.length === 0
    );

    if (rootNodes.length === 0) {
      throw new Error("No root nodes found - circular dependency detected");
    }

    // Process levels
    let currentLevel = 0;
    let nodesToProcess = [...rootNodes];

    while (nodesToProcess.length > 0) {
      const levelSteps: PlanStep[] = [];
      const nextLevelNodes: string[] = [];

      // Process all nodes at current level
      nodesToProcess.forEach((nodeId) => {
        if (!visited.has(nodeId)) {
          const step = graph.nodes.get(nodeId)!;
          levelSteps.push(step);
          visited.add(nodeId);

          // Add dependent nodes to next level
          const dependents = graph.edges.get(nodeId)!;
          dependents.forEach((depId) => {
            if (!visited.has(depId) && !inProgress.has(depId)) {
              // Check if all dependencies are satisfied
              const allDepsSatisfied = graph.reverseEdges
                .get(depId)!
                .every((dep) => visited.has(dep));

              if (allDepsSatisfied) {
                nextLevelNodes.push(depId);
              }
            }
          });
        }
      });

      if (levelSteps.length > 0) {
        levels.push({
          level: currentLevel,
          steps: levelSteps,
          canRunInParallel: levelSteps.length > 1,
        });
      }

      nodesToProcess = nextLevelNodes;
      currentLevel++;
    }

    return levels;
  }

  /**
   * Find the critical path (longest path through the dependency graph)
   */
  private static findCriticalPath(
    graph: DependencyGraph,
    steps: PlanStep[]
  ): string[] {
    const durations = new Map<string, number>();
    const predecessors = new Map<string, string | null>();

    // Initialize durations
    steps.forEach((step) => {
      durations.set(step.id, step.estimatedDuration || 1000); // Default 1 second
    });

    // Topological sort
    const sorted = this.topologicalSort(graph);

    // Calculate longest path
    sorted.forEach((nodeId) => {
      const dependents = graph.edges.get(nodeId)!;
      dependents.forEach((depId) => {
        const newDuration = durations.get(nodeId)! + durations.get(depId)!;
        if (newDuration > durations.get(depId)!) {
          durations.set(depId, newDuration);
          predecessors.set(depId, nodeId);
        }
      });
    });

    // Find the node with maximum duration
    let maxDuration = 0;
    let endNode = "";
    durations.forEach((duration, nodeId) => {
      if (duration > maxDuration) {
        maxDuration = duration;
        endNode = nodeId;
      }
    });

    // Reconstruct critical path
    const criticalPath: string[] = [];
    let currentNode = endNode;
    while (currentNode) {
      criticalPath.unshift(currentNode);
      currentNode = predecessors.get(currentNode) || "";
    }

    return criticalPath;
  }

  /**
   * Detect circular dependencies using DFS
   */
  private static detectCircularDependencies(
    graph: DependencyGraph
  ): string[][] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        cycles.push(path.slice(cycleStart));
        return;
      }

      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const dependents = graph.edges.get(nodeId)!;
      dependents.forEach((depId) => {
        dfs(depId, [...path]);
      });

      recursionStack.delete(nodeId);
    };

    graph.nodes.forEach((_, nodeId) => {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    });

    return cycles;
  }

  /**
   * Calculate estimated total duration
   */
  private static calculateEstimatedDuration(levels: ExecutionLevel[]): number {
    return levels.reduce((total, level) => {
      if (level.canRunInParallel) {
        // For parallel execution, take the maximum duration in the level
        const maxDuration = Math.max(
          ...level.steps.map((step) => step.estimatedDuration || 1000)
        );
        return total + maxDuration;
      } else {
        // For sequential execution, sum all durations
        return (
          total +
          level.steps.reduce(
            (sum, step) => sum + (step.estimatedDuration || 1000),
            0
          )
        );
      }
    }, 0);
  }

  /**
   * Topological sort using Kahn's algorithm
   */
  private static topologicalSort(graph: DependencyGraph): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Calculate in-degrees
    graph.nodes.forEach((_, nodeId) => {
      inDegree.set(nodeId, graph.reverseEdges.get(nodeId)!.length);
      if (inDegree.get(nodeId) === 0) {
        queue.push(nodeId);
      }
    });

    // Process queue
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      graph.edges.get(nodeId)!.forEach((depId) => {
        const newInDegree = inDegree.get(depId)! - 1;
        inDegree.set(depId, newInDegree);

        if (newInDegree === 0) {
          queue.push(depId);
        }
      });
    }

    return result;
  }

  /**
   * Optimize execution order for better performance
   */
  static optimizeExecutionOrder(
    analysis: DependencyAnalysis
  ): ExecutionLevel[] {
    const optimizedLevels = [...analysis.levels];

    // Sort steps within each level by priority and estimated duration
    optimizedLevels.forEach((level) => {
      level.steps.sort((a, b) => {
        // First by priority (higher first)
        const priorityDiff = (b.priority || 0) - (a.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;

        // Then by estimated duration (shorter first for better parallelization)
        return (a.estimatedDuration || 1000) - (b.estimatedDuration || 1000);
      });
    });

    return optimizedLevels;
  }

  /**
   * Validate plan for common issues
   */
  static validatePlan(plan: Plan): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    const analysis = this.analyze(plan);

    // Check for circular dependencies
    if (analysis.circularDependencies.length > 0) {
      issues.push(
        `Circular dependencies detected: ${analysis.circularDependencies
          .map((cycle) => cycle.join(" -> "))
          .join(", ")}`
      );
    }

    // Check for orphaned steps
    const allStepIds = new Set(plan.steps.map((s) => s.id));
    plan.steps.forEach((step) => {
      if (step.dependencies) {
        step.dependencies.forEach((depId) => {
          if (!allStepIds.has(depId)) {
            issues.push(
              `Step ${step.id} depends on non-existent step ${depId}`
            );
          }
        });
      }
    });

    // Check for unreachable steps
    const reachableSteps = new Set<string>();
    const rootSteps = plan.steps.filter(
      (s) => !s.dependencies || s.dependencies.length === 0
    );

    const markReachable = (stepId: string) => {
      if (reachableSteps.has(stepId)) return;
      reachableSteps.add(stepId);
      const dependents = analysis.graph.edges.get(stepId) || [];
      dependents.forEach(markReachable);
    };

    rootSteps.forEach((step) => markReachable(step.id));

    const unreachableSteps = plan.steps.filter(
      (s) => !reachableSteps.has(s.id)
    );
    if (unreachableSteps.length > 0) {
      issues.push(
        `Unreachable steps: ${unreachableSteps.map((s) => s.id).join(", ")}`
      );
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}
