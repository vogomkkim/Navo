/**
 * Project Architect Agent (기존 Error Analyzer 확장)
 *
 * AI를 사용하여 프로젝트 요구사항을 분석하고 아키텍처를 설계하는 에이전트
 * 에러 해결과 프로젝트 설계를 모두 지원합니다.
 */

import {
  BaseAgent,
  MasterDeveloperAgent,
} from "../core/masterDeveloper.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs/promises";
import { exec as cpExec } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(cpExec);

export class ProjectArchitectAgent extends BaseAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;
  

  constructor() {
    super("ProjectArchitectAgent", 1); // 최고 우선순위

    // Gemini API 초기화
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  /**
   * 이 에이전트가 처리할 수 있는 요청인지 확인
   * Project Architect Agent는 프로젝트 설계와 에러 분석을 모두 지원
   */
  canHandle(request: any): boolean {
    // 프로젝트 생성 요청인지 확인
    if (
      request &&
      typeof request === "object" &&
      request.name &&
      request.description
    ) {
      return true; // 프로젝트 설계 요청
    }

    return false;
  }

  /**
   * 프로젝트 설계 또는 에러 분석 실행
   */
  async execute(request: any, context: any): Promise<any> {
    try {
      // 프로젝트 설계 요청인지 확인
      if (
        request &&
        typeof request === "object" &&
        request.name &&
        request.description
      ) {
        return await this.designProject(request, context);
      }

      throw new Error("지원하지 않는 요청 타입입니다.");
    } catch (e) {
      this.logger.error("Project Architect Agent 실행 실패:", { error: e });
      throw e;
    }
  }

  /**
   * 프로젝트 설계 실행
   */
  private async designProject(request: any, context: any): Promise<any> {
    try {
      this.logger.info("🏗️ 프로젝트 아키텍처 설계 시작", { request });

      // AI를 사용한 프로젝트 아키텍처 설계
      const architecture = await this.designArchitectureWithAI(
        request,
        context
      );

      this.logger.info("✅ 프로젝트 아키텍처 설계 완료", { architecture });

      return {
        success: true,
        architecture,
        executionTime: Date.now(),
        nextSteps: [
          "아키텍처 설계 완료: UI/UX Designer Agent가 인터페이스를 설계합니다",
          "Code Generator Agent가 실제 코드를 생성합니다",
          "Development Guide Agent가 개발 가이드를 작성합니다",
        ],
      };
    } catch (e) {
      this.logger.error("프로젝트 설계 실패:", { error: e });
      throw e;
    }
  }

  

  /**
   * AI를 사용하여 프로젝트 아키텍처 설계
   */
  private async designArchitectureWithAI(
    request: any,
    context: any
  ): Promise<any> {
    try {
      const prompt = `
당신은 세계 최고의 소프트웨어 아키텍트입니다. 당신의 임무는 사용자의 요구사항에 따라 완전한 프로젝트 구조를 설계하고, 이를 단 하나의 깔끔한 JSON 객체로 출력하는 것입니다. 이 JSON은 프로젝트의 전체 파일 시스템을 가상으로 표현합니다.

**프로젝트 요구사항:**
- **프로젝트명:** ${request.name}
- **설명:** ${request.description}
- **프로젝트 타입:** ${request.type}
- **주요 기능:** ${request.features.join(", ")}
- **복잡도:** ${request.complexity || "medium"}

**기술 제약 조건:**
- **프론트엔드:** React와 JSX를 사용하세요. 모든 컴포넌트는 함수형 컴포넌트여야 합니다.
- **백엔드:** Supabase Edge Functions를 사용하세요.
- **데이터베이스:** PostgreSQL을 사용하세요.
- **스타일링:** 표준 CSS 파일을 사용하세요.

**JSON 출력 지침:**
- JSON의 루트는 "project"라는 단일 키를 가진 객체여야 합니다.
- "project" 객체는 "name"과 "file_structure" 객체를 포함해야 합니다.
- "file_structure"는 노드의 재귀적인 구조여야 합니다.
- 각 노드는 "type"('folder' 또는 'file')을 가져야 합니다.
- 각 노드는 "name"을 가져야 합니다.
- 폴더는 다른 노드를 포함하는 "children" 배열을 가져야 합니다.
- 파일은 해당 파일의 완전하고 잘 서식된 소스 코드를 포함하는 "content" 문자열을 가져야 합니다.
- 
package.json
, 빌드 구성, 기본 
index.html
, 페이지용 React 컴포넌트, 예제 Supabase 함수 등 필요한 모든 파일을 생성하세요.

**JSON 구조 예시:**
\n\
{
  "project": {
    "name": "예제프로젝트",
    "file_structure": {
      "type": "folder",
      "name": "src",
      "children": [
        {
          "type": "folder",
          "name": "src",
          "children": [
            {
              "type": "file",
              "name": "index.js",
              "content": "import React from 'react';\nimport ReactDOM from 'react-dom';\nimport App from './App.js';\n\nReactDOM.render(<App />, document.getElementById('root'));"
            },
            {
              "type": "file",
              "name": "App.js",
              "content": "import React from 'react';\nimport HomePage from './pages/HomePage.js';\n\nfunction App() {\n  return (\n    <div className=\"App\">
      <HomePage />
    </div>
  );
}

export default App;"
            },
            {
              "type": "folder",
              "name": "pages",
              "children": [
                {
                  "type": "file",
                  "name": "HomePage.js",
                  "content": "import React from 'react';\n\nfunction HomePage() {\n  return <h1>홈페이지에 오신 것을 환영합니다</h1>;
}

export default HomePage;"
                }
              ]
            }
          ]
        },
        {
          "type": "file",
          "name": "package.json",
          "content": "{\n  \"name\": \"example-project\",\n  \"version\": \"1.0.0\",\n  \"dependencies\": {\n    \"react\": \"^18.0.0\",\n    \"react-dom\": \"^18.0.0\"\n  }\n}"
        }
      ]
    }
  }
}
\

이제 사용자의 프로젝트 요구사항에 따라 완전한 JSON 객체를 생성하세요.
      `;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // 마크다운 코드 블록 제거
      let cleanResponse = text;
      if (text.includes("```json")) {
        cleanResponse = text.replace(/```json\s*/, "").replace(/\s*```$/, "");
      } else if (text.includes("```")) {
        cleanResponse = text.replace(/```\s*/, "").replace(/\s*```$/, "");
      }

      try {
        // JSON 파싱
        const architecture = JSON.parse(cleanResponse);
        return architecture;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error("AI 아키텍처 설계 실패: JSON 파싱 오류", {
          error: errorMessage,
          rawResponse: cleanResponse,
        });
        throw new Error(`AI 아키텍처 설계 실패: ${errorMessage}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error("AI 아키텍처 설계 실패:", { error: errorMessage });
      throw new Error(`AI 아키텍처 설계 실패: ${errorMessage}`);
    }
  }
}