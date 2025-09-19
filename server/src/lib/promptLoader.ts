// server/src/lib/promptLoader.ts
import * as fs from "fs";
import * as path from "path";

export class PromptLoader {
  private static cache = new Map<string, string>();

  private static load(templateName: string): string {
    if (this.cache.has(templateName)) {
      return this.cache.get(templateName)!;
    }

    // 현재 파일(__dirname) 기준으로 prompts 디렉토리 찾기
    const currentDir = __dirname; // server/src/lib
    const promptsDir = path.resolve(currentDir, "..", "prompts");
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
