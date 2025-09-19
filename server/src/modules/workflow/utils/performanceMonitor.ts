/**
 * @file Performance monitoring and optimization utilities for workflow execution
 */

import { Plan, PlanStep } from "../types";

export interface PerformanceMetrics {
  totalExecutionTime: number;
  stepMetrics: Map<string, StepMetrics>;
  levelMetrics: Map<number, LevelMetrics>;
  resourceUsage: ResourceUsage;
  optimizationSuggestions: string[];
}

export interface StepMetrics {
  stepId: string;
  executionTime: number;
  retryCount: number;
  memoryUsage: number;
  cpuUsage: number;
  success: boolean;
  errorType?: string;
}

export interface LevelMetrics {
  level: number;
  executionTime: number;
  parallelSteps: number;
  sequentialSteps: number;
  efficiency: number; // 0-1, higher is better
}

export interface ResourceUsage {
  peakMemoryUsage: number;
  averageCpuUsage: number;
  diskIO: number;
  networkIO: number;
}

export class PerformanceMonitor {
  private startTime: number = 0;
  private stepMetrics: Map<string, StepMetrics> = new Map();
  private levelMetrics: Map<number, LevelMetrics> = new Map();
  private resourceUsage: ResourceUsage = {
    peakMemoryUsage: 0,
    averageCpuUsage: 0,
    diskIO: 0,
    networkIO: 0,
  };

  /**
   * Start monitoring a workflow execution
   */
  startMonitoring(): void {
    this.startTime = Date.now();
    this.stepMetrics.clear();
    this.levelMetrics.clear();
    this.resourceUsage = {
      peakMemoryUsage: 0,
      averageCpuUsage: 0,
      diskIO: 0,
      networkIO: 0,
    };
  }

  /**
   * Record step execution metrics
   */
  recordStepExecution(
    step: PlanStep,
    executionTime: number,
    retryCount: number,
    success: boolean,
    errorType?: string
  ): void {
    const memoryUsage = this.getCurrentMemoryUsage();
    const cpuUsage = this.getCurrentCpuUsage();

    this.stepMetrics.set(step.id, {
      stepId: step.id,
      executionTime,
      retryCount,
      memoryUsage,
      cpuUsage,
      success,
      errorType,
    });

    // Update resource usage
    this.resourceUsage.peakMemoryUsage = Math.max(
      this.resourceUsage.peakMemoryUsage,
      memoryUsage
    );
    this.resourceUsage.averageCpuUsage =
      (this.resourceUsage.averageCpuUsage + cpuUsage) / 2;
  }

  /**
   * Record level execution metrics
   */
  recordLevelExecution(
    level: number,
    executionTime: number,
    parallelSteps: number,
    sequentialSteps: number
  ): void {
    const totalSteps = parallelSteps + sequentialSteps;
    const efficiency = parallelSteps / totalSteps; // Higher parallel steps = better efficiency

    this.levelMetrics.set(level, {
      level,
      executionTime,
      parallelSteps,
      sequentialSteps,
      efficiency,
    });
  }

  /**
   * Get current memory usage in MB
   */
  private getCurrentMemoryUsage(): number {
    const memUsage = process.memoryUsage();
    return Math.round(memUsage.heapUsed / 1024 / 1024);
  }

  /**
   * Get current CPU usage (simplified)
   */
  private getCurrentCpuUsage(): number {
    // This is a simplified CPU usage calculation
    // In production, you might want to use a more sophisticated approach
    const cpuUsage = process.cpuUsage();
    return cpuUsage.user + cpuUsage.system;
  }

  /**
   * Generate performance metrics
   */
  generateMetrics(): PerformanceMetrics {
    const totalExecutionTime = Date.now() - this.startTime;

    const metrics: PerformanceMetrics = {
      totalExecutionTime,
      stepMetrics: new Map(this.stepMetrics),
      levelMetrics: new Map(this.levelMetrics),
      resourceUsage: { ...this.resourceUsage },
      optimizationSuggestions: [], // Initialize as empty
    };

    // Now, generate suggestions based on the metrics we just collected.
    metrics.optimizationSuggestions = this.generateOptimizationSuggestions(metrics);

    return metrics;
  }

  /**
   * Generate optimization suggestions based on metrics
   */
  private generateOptimizationSuggestions(metrics: PerformanceMetrics): string[] {
    const suggestions: string[] = [];

    // Analyze step execution times
    const slowSteps = Array.from(metrics.stepMetrics.values())
      .filter((step) => step.executionTime > 5000) // Steps taking more than 5 seconds
      .sort((a, b) => b.executionTime - a.executionTime);

    if (slowSteps.length > 0) {
      suggestions.push(
        `Consider optimizing slow steps: ${slowSteps
          .slice(0, 3)
          .map((s) => s.stepId)
          .join(", ")}`
      );
    }

    // Analyze retry patterns
    const highRetrySteps = Array.from(metrics.stepMetrics.values()).filter(
      (step) => step.retryCount > 2
    );

    if (highRetrySteps.length > 0) {
      suggestions.push(
        `High retry count detected for steps: ${highRetrySteps
          .map((s) => s.stepId)
          .join(", ")}. Consider improving error handling.`
      );
    }

    // Analyze parallelization efficiency
    const inefficientLevels = Array.from(metrics.levelMetrics.values()).filter(
      (level) => level.efficiency < 0.5 && level.parallelSteps > 1
    );

    if (inefficientLevels.length > 0) {
      suggestions.push(
        `Consider improving parallelization for levels: ${inefficientLevels
          .map((l) => l.level)
          .join(", ")}`
      );
    }

    // Analyze resource usage
    if (metrics.resourceUsage.peakMemoryUsage > 500) {
      // More than 500MB
      suggestions.push(
        "High memory usage detected. Consider optimizing memory-intensive operations."
      );
    }

    if (metrics.resourceUsage.averageCpuUsage > 1000000) {
      // Arbitrary threshold
      suggestions.push(
        "High CPU usage detected. Consider optimizing CPU-intensive operations."
      );
    }

    return suggestions;
  }

  /**
   * Get performance summary for logging
   */
  getPerformanceSummary(): string {
    const metrics = this.generateMetrics();
    const totalSteps = metrics.stepMetrics.size;
    const successfulSteps = Array.from(metrics.stepMetrics.values()).filter(
      (step) => step.success
    ).length;
    const failedSteps = totalSteps - successfulSteps;
    const totalRetries = Array.from(metrics.stepMetrics.values()).reduce(
      (sum, step) => sum + step.retryCount,
      0
    );

    return `
Performance Summary:
- Total Execution Time: ${metrics.totalExecutionTime}ms
- Steps: ${successfulSteps}/${totalSteps} successful (${failedSteps} failed)
- Total Retries: ${totalRetries}
- Peak Memory Usage: ${metrics.resourceUsage.peakMemoryUsage}MB
- Execution Levels: ${metrics.levelMetrics.size}
- Optimization Suggestions: ${metrics.optimizationSuggestions.length}
    `.trim();
  }

  /**
   * Compare with previous execution metrics
   */
  compareWithPrevious(previousMetrics: PerformanceMetrics): {
    improvement: number; // Percentage improvement
    regressions: string[];
    improvements: string[];
  } {
    const currentMetrics = this.generateMetrics();
    const timeImprovement =
      ((previousMetrics.totalExecutionTime -
        currentMetrics.totalExecutionTime) /
        previousMetrics.totalExecutionTime) *
      100;

    const regressions: string[] = [];
    const improvements: string[] = [];

    // Compare execution times
    if (timeImprovement > 0) {
      improvements.push(
        `Execution time improved by ${timeImprovement.toFixed(1)}%`
      );
    } else if (timeImprovement < -10) {
      regressions.push(
        `Execution time regressed by ${Math.abs(timeImprovement).toFixed(1)}%`
      );
    }

    // Compare memory usage
    const memoryImprovement =
      ((previousMetrics.resourceUsage.peakMemoryUsage -
        currentMetrics.resourceUsage.peakMemoryUsage) /
        previousMetrics.resourceUsage.peakMemoryUsage) *
      100;

    if (memoryImprovement > 0) {
      improvements.push(
        `Memory usage improved by ${memoryImprovement.toFixed(1)}%`
      );
    } else if (memoryImprovement < -10) {
      regressions.push(
        `Memory usage regressed by ${Math.abs(memoryImprovement).toFixed(1)}%`
      );
    }

    return {
      improvement: timeImprovement,
      regressions,
      improvements,
    };
  }
}
