// scripts/list-tools.ts
import * as fs from 'fs';
import * as path from 'path';

// 1. Read the content of the tool registry file as plain text.
const registryFilePath = path.resolve(__dirname, '../server/src/modules/workflow/index.ts');
const fileContent = fs.readFileSync(registryFilePath, 'utf-8');

// 2. Use a regular expression to find all tool registration lines.
// This regex looks for "toolRegistry.register(" followed by any characters until the closing parenthesis.
const registrationRegex = /toolRegistry\.register\(([^)]+)\)/g;

// 3. Extract the tool names from the matches.
const toolNames = new Set<string>();
let match;
while ((match = registrationRegex.exec(fileContent)) !== null) {
  // The first capturing group contains the tool variable name.
  // e.g., "new DenoFunctionsGeneratorTool()" or "createProjectInDbTool"
  const registeredItem = match[1].trim();
  
  // Handle class instantiations like "new DenoFunctionsGeneratorTool()"
  if (registeredItem.startsWith('new ')) {
    const className = registeredItem.split('(')[0].replace('new ', '');
    toolNames.add(className);
  } else {
    toolNames.add(registeredItem);
  }
}

// 4. Print the results.
console.log('--- Dynamically Parsed Tools ---');
toolNames.forEach(name => {
  console.log(`- ${name}`);
});
console.log(`\nTotal: ${toolNames.size} tools found.`);