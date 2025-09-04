/**
 * @file Utility function for resolving dynamic inputs in a workflow plan.
 */

/**
 * Resolves input values by replacing dynamic references with actual outputs from previous steps.
 * @param inputs The input object for a step.
 * @param outputs The map of all completed step outputs.
 * @returns A new object with all references resolved.
 */
export function resolveInputs(
  inputs: Record<string, any>,
  outputs: Map<string, any>,
): Record<string, any> {
  const resolved: Record<string, any> = {};
  for (const key in inputs) {
    const value = inputs[key];

    if (typeof value !== 'string') {
      resolved[key] = value;
      continue;
    }

    // Case 1: The entire string is a placeholder (e.g., "${steps.step1.outputs.project}")
    const fullMatch = value.match(/^\${(steps\.(.*?)\.outputs\.?(.*))}$/);
    if (fullMatch) {
      const parts = fullMatch[1].trim().split('.');
      const stepId = parts[1];
      const stepOutput = outputs.get(stepId);

      if (stepOutput !== undefined) {
        let nestedValue = stepOutput;
        const propertyPath = parts.slice(3);
        for (const prop of propertyPath) {
          if (nestedValue === undefined) break;
          nestedValue = nestedValue[prop];
        }
        resolved[key] = nestedValue;
      } else {
        resolved[key] = value; // Keep as is if not found
      }
      continue;
    }

    // Case 2: The string contains inline placeholders
    const placeholderRegex = /\${(steps\.(.*?)\.outputs\.?(.*))}/g;
    resolved[key] = value.replace(
      placeholderRegex,
      (match, placeholder) => {
        const parts = placeholder.trim().split('.');
        const stepId = parts[1];
        const stepOutput = outputs.get(stepId);

        if (stepOutput !== undefined) {
          let nestedValue = stepOutput;
          const propertyPath = parts.slice(3);
          for (const prop of propertyPath) {
            if (nestedValue === undefined) break;
            nestedValue = nestedValue[prop];
          }
          return String(nestedValue ?? '');
        }
        return match;
      },
    );
  }
  return resolved;
}
