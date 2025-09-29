// server/src/lib/promptLoader.ts
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

export class PromptLoader {
  private static cache = new Map<string, string>();

  private static load(templateName: string): string {
    if (this.cache.has(templateName)) {
      return this.cache.get(templateName)!;
    }

    // ES 모듈에서 __dirname 대신 import.meta.url 사용
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const promptsDir = path.resolve(__dirname, "..", "prompts");
    const templatePath = path.join(promptsDir, templateName);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Prompt template not found at: ${templatePath}`);
    }

    const content = fs.readFileSync(templatePath, "utf-8");
    this.cache.set(templateName, content);
    return content;
  }

  static render(templateName: string, variables: Record<string, any>): string {
    let template = this.load(templateName);

    // Replace {{variableName}} style placeholders
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\s*${key}\s*}}`, "g");
      template = template.replace(placeholder, String(value));
    });

    return template;
  }
}
