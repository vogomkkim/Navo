import React, { useState } from 'react';

const SimpleUIGenerator = () => {
  const [userInput, setUserInput] = useState('');
  const [generatedHTML, setGeneratedHTML] = useState('');
  const [generatedCSS, setGeneratedCSS] = useState('');

  // 간단한 AI 시뮬레이션 (실제로는 AI API 호출)
  const generateUI = () => {
    // 간단한 패턴 매칭으로 UI 생성
    let html = '';
    let css = '';

    if (userInput.toLowerCase().includes('header')) {
      html += `
        <header class="main-header">
          <h1>My Awesome Website</h1>
          <nav>
            <a href="#">Home</a>
            <a href="#">About</a>
            <a href="#">Contact</a>
          </nav>
        </header>
      `;
      css += `
        .main-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          text-align: center;
        }
        .main-header nav a {
          color: white;
          text-decoration: none;
          margin: 0 15px;
          font-weight: bold;
        }
      `;
    }

    if (userInput.toLowerCase().includes('hero')) {
      html += `
        <section class="hero">
          <h2>Welcome to the Future</h2>
          <p>This is an amazing hero section created by AI!</p>
          <button class="cta-button">Get Started</button>
        </section>
      `;
      css += `
        .hero {
          background: linear-gradient(45deg, #f093fb 0%, #f5576c 100%);
          color: white;
          padding: 100px 20px;
          text-align: center;
        }
        .hero h2 {
          font-size: 3rem;
          margin-bottom: 20px;
        }
        .cta-button {
          background: white;
          color: #f5576c;
          border: none;
          padding: 15px 30px;
          border-radius: 25px;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: pointer;
          margin-top: 20px;
        }
      `;
    }

    if (userInput.toLowerCase().includes('card') || userInput.toLowerCase().includes('feature')) {
      html += `
        <section class="features">
          <div class="feature-card">
            <h3>🚀 Fast</h3>
            <p>Lightning fast performance</p>
          </div>
          <div class="feature-card">
            <h3>🎨 Beautiful</h3>
            <p>Stunning visual design</p>
          </div>
          <div class="feature-card">
            <h3>📱 Responsive</h3>
            <p>Works on all devices</p>
          </div>
        </section>
      `;
      css += `
        .features {
          display: flex;
          gap: 20px;
          padding: 50px 20px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .feature-card {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          text-align: center;
          min-width: 200px;
          transition: transform 0.3s ease;
        }
        .feature-card:hover {
          transform: translateY(-5px);
        }
      `;
    }

    if (!html) {
      html = `
        <div class="default">
          <h1>Hello World!</h1>
          <p>Try typing: "create a header and hero section"</p>
        </div>
      `;
      css = `
        .default {
          padding: 50px;
          text-align: center;
          background: #f8f9fa;
        }
      `;
    }

    setGeneratedHTML(html);
    setGeneratedCSS(css);
  };

  // 프로젝트 파일들 생성
  const generateProjectFiles = () => {
    const files = {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Site</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    ${generatedHTML}
    <script src="script.js"></script>
</body>
</html>`,

      'styles.css': `/* Generated Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Arial', sans-serif;
  line-height: 1.6;
}

${generatedCSS}`,

      'script.js': `// Generated JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Generated site loaded successfully!');

    // Add interactive features
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            alert('Button clicked! This is a generated site.');
        });
    });

    // Add hover effects
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
});`,

      'README.md': `# Generated Website

This website was generated using AI-powered web builder.

## Project Structure
\`\`\`
/
├── index.html      # Main HTML file
├── styles.css      # CSS styles
├── script.js       # JavaScript functionality
└── README.md       # This file
\`\`\`

## How to run
1. Open \`index.html\` in your browser
2. Or serve with a local server:
   \`\`\`
   npx serve .
   \`\`\`

## Features
- Responsive design
- Modern CSS animations
- Interactive JavaScript
- Clean project structure

Generated at: ${new Date().toISOString()}
`,

      'package.json': `{
  "name": "generated-website",
  "version": "1.0.0",
  "description": "AI-generated website",
  "main": "index.html",
  "scripts": {
    "start": "npx serve .",
    "dev": "npx live-server ."
  },
  "keywords": ["ai", "generated", "website"],
  "author": "AI Web Builder",
  "license": "MIT",
  "devDependencies": {
    "serve": "^14.0.0",
    "live-server": "^1.2.2"
  }
}`
    };

    return files;
  };

  // ZIP 파일 생성 및 다운로드
  const downloadZip = async () => {
    const JSZip = (await import('https://cdn.skypack.dev/jszip')).default;
    const zip = new JSZip();
    const files = generateProjectFiles();

    // 각 파일을 ZIP에 추가
    Object.entries(files).forEach(([filename, content]) => {
      zip.file(filename, content);
    });

    // ZIP 생성 및 다운로드
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-website-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 단일 HTML 미리보기용
  const getFullHTML = () => {
    const files = generateProjectFiles();
    return files['index.html'].replace(
      '<link rel="stylesheet" href="styles.css">',
      `<style>${files['styles.css']}</style>`
    ).replace(
      '<script src="script.js"></script>',
      `<script>${files['script.js']}</script>`
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Simple UI Generator</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Input Section */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Tell me what to create:</h2>
            <textarea
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none"
              placeholder="Try: 'Create a header and hero section with cards'"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
            />
            <button
              onClick={generateUI}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Generate UI ✨
            </button>
          </div>

          {/* Generated Code */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Generated Code:</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {generatedHTML && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-600 mb-2">HTML:</h3>
                  <pre className="bg-gray-100 p-3 text-xs rounded overflow-x-auto">
                    {generatedHTML}
                  </pre>
                </div>
              )}
              {generatedCSS && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-600 mb-2">CSS:</h3>
                  <pre className="bg-gray-100 p-3 text-xs rounded overflow-x-auto">
                    {generatedCSS}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Preview */}
        {generatedHTML && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Live Preview:</h2>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <iframe
                srcDoc={getFullHTML()}
                className="w-full h-96"
                title="Preview"
              />
            </div>

            <div className="mt-4 flex gap-4 justify-center">
              <button
                onClick={() => {
                  const files = generateProjectFiles();
                  const blob = new Blob([files['index.html']], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'index.html';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Download HTML 📄
              </button>

              <button
                onClick={downloadZip}
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                Download Project ZIP 📦
              </button>
            </div>
          </div>
        )}

        {/* Project Structure Preview */}
        {generatedHTML && (
          <div className="bg-white p-6 rounded-lg shadow mt-6">
            <h2 className="text-xl font-semibold mb-4">Project Structure:</h2>
            <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
              <div className="text-blue-600">📁 generated-website/</div>
              <div className="ml-4 text-green-600">📄 index.html</div>
              <div className="ml-4 text-green-600">📄 styles.css</div>
              <div className="ml-4 text-green-600">📄 script.js</div>
              <div className="ml-4 text-green-600">📄 package.json</div>
              <div className="ml-4 text-green-600">📄 README.md</div>
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">📄 package.json</h3>
                <pre className="bg-gray-100 p-3 text-xs rounded overflow-x-auto max-h-32">
{JSON.stringify(JSON.parse(generateProjectFiles()['package.json']), null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold mb-2">📄 README.md</h3>
                <pre className="bg-gray-100 p-3 text-xs rounded overflow-x-auto max-h-32">
{generateProjectFiles()['README.md'].substring(0, 200)}...
                </pre>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>💡 Tip:</strong> ZIP 파일 다운로드 후 압축 해제하면 완전한 웹사이트 프로젝트가 생성됩니다.
                <code className="bg-yellow-100 px-1 rounded">npm start</code> 명령으로 로컬 서버 실행 가능!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleUIGenerator;


========================================== description =====================================================

1) 개념

자연어 입력 → HTML/CSS 조각 생성 → 미리보기/ZIP 배포까지 한 컴포넌트에서 처리하는 초간단 UI 생성기.

키워드 매칭(header/hero/card)로 템플릿 조합, iframe srcDoc으로 프리뷰, 메모리 상에서 index.html / styles.css / script.js / README.md / package.json 만들고 ZIP 다운로드.

2) 컨셉

**LLM 없이도 “패턴 기반 UI 생성”**을 체험하게 하는 최소작동(MVP).

“나중에 LLM 연결”을 전제로, 현재는 화이트리스트 템플릿 조립기로 안전하게 시작.

3) 예시(동작 흐름)

입력: “create a header and hero section with cards”

생성:

HTML: <header>…</header>, .hero, .features .feature-card 블록 추가

CSS: 각 블록 스타일 조합

미리보기: iframe srcDoc

배포: JSZip으로 ZIP(index.html에 링크/스크립트 연결) 다운로드

4) 보완점(중요도 순)
보안

XSS 차단: 사용자 입력이 템플릿에 섞여 iframe에서 실행될 수 있음 → Sanitize 필수

프리뷰 격리: iframe에 sandbox 지정(가능하면 allow-same-origin 피함)

외부 CDN 동적 import 제거: jszip을 npm 의존성으로 번들에 포함

CSP 고려: 배포 시 default-src 'self' 중심으로 정책 설계

구조/유지보수

관심사 분리:

parseIntent() / buildHtml() / buildCss() / scaffoldProject()로 모듈화

에러/로딩 상태: ZIP 생성·동적 처리 실패 시 사용자 피드백

테스트 포인트 확보: 입력→스펙, 스펙→템플릿 조합을 단위 테스트 가능하게

관측성/DX

postMessage 로깅: 프리뷰 iframe 내부 오류를 상위에서 수집

템플릿 버전관리: 컴포넌트 팔레트(헤더/히어로/카드/푸터…)를 버전/옵션화

확장 경로: “자연어 → JSON 스펙 → 템플릿 조립” 2단계로 분리 후 LLM 연결

5) 최소 패치 코드

(a) 프리뷰 격리 강화

<iframe
  srcDoc={getFullHTML()}
  className="w-full h-96"
  title="Preview"
  sandbox="allow-scripts"
  referrerPolicy="no-referrer"
/>


(b) Sanitization (DOMPurify)

npm i dompurify

import DOMPurify from 'dompurify';

const safeHTML = DOMPurify.sanitize(generatedHTML, { ALLOWED_ATTR: ['href','class'] });
const safeCSS  = DOMPurify.sanitize(generatedCSS);

const getFullHTML = () => {
  const files = generateProjectFiles({ html: safeHTML, css: safeCSS });
  return files['index.html']
    .replace('<link rel="stylesheet" href="styles.css">', `<style>${files['styles.css']}</style>`)
    .replace('<script src="script.js"></script>', `<script>${files['script.js']}</script>`);
};


(c) JSZip 번들 포함

npm i jszip

import JSZip from 'jszip';

const downloadZip = async () => {
  const zip = new JSZip();
  const files = generateProjectFiles();
  Object.entries(files).forEach(([name, content]) => zip.file(name, content));
  const blob = await zip.generateAsync({ type: 'blob' });
  // ...다운로드 동일
};

6) 리팩터 구조 스케치
// uiGenerator.ts
export type Intent = { header: boolean; hero: boolean; cards: boolean };

export const parseIntent = (input: string): Intent => { /* 키워드 → Intent */ };
export const buildHtml = (i: Intent) => { /* intent → html */ };
export const buildCss  = (i: Intent) => { /* intent → css  */ };

export const scaffoldProject = ({ html, css }: { html: string; css: string }) => ({
  'index.html': /* html+css inline or link */,
  'styles.css': css,
  'script.js' : /* basics */,
  'README.md' : /* guide */,
  'package.json': /* scripts */
});


컴포넌트는 상태/이벤트/UI만 담당.

7) 다음 단계(로드맵)

입력→Intent를 JSON으로 분리(후에 LLM이 이 부분만 교체)

템플릿 옵션화: 색상/레이아웃/그리드/아이콘 세트 파라미터

프리뷰 통신: window.postMessage로 프리뷰 로그/에러 수집

CSP + 다운로드 보안: 배포 환경 헤더 구성, rel="noopener" 등 적용

LLM 연동: “자연어 → Intent(JSON)”까지 LLM, 조립은 로컬 화이트리스트로 안전 보장

한 줄 요약: 지금 구조는 데모로 훌륭하고, 보안(정화+격리)·모듈화·번들화(JSZip)만 넣으면 바로 실사용 가능한 ‘로컬 템플릿 조립형 UI 생성기’가 된다.


핵심 보완점에 딱 맞는 최소 예시 코드는 꼭 들어가야 이해/적용이 쉽다. 아래 4개 “드롭인 패치”만 넣으면 충분히 따라온다.

1) 프리뷰 격리 (iframe sandbox)
<iframe
  srcDoc={getFullHTML()}
  className="w-full h-96"
  title="Preview"
  sandbox="allow-scripts"
  referrerPolicy="no-referrer"
/>


설명: 실행은 되되, 상위 접근 차단. allow-same-origin은 가능하면 피함.

2) Sanitization (DOMPurify) — 결과물만 정화
npm i dompurify

import DOMPurify from 'dompurify';

const sanitize = (html: string, css: string) => ({
  html: DOMPurify.sanitize(html, { ALLOWED_ATTR: ['href','class'] }),
  css : DOMPurify.sanitize(css),
});

const getFullHTML = () => {
  const files = generateProjectFiles(); // 기존 함수 사용
  const safe = sanitize(generatedHTML, generatedCSS);

  return files['index.html']
    .replace('<link rel="stylesheet" href="styles.css">', `<style>${safe.css}</style>`)
    .replace('<script src="script.js"></script>', `<script>${files['script.js']}</script>`)
    .replace('${generatedHTML}', safe.html); // index.html 템플릿에서 치환되도록 한 줄 추가
};


설명: 사용자가 만든 문자열을 삽입 직전에 정화.

3) JSZip CDN 제거 → 번들 포함
npm i jszip

import JSZip from 'jszip';

const downloadZip = async () => {
  const zip = new JSZip();
  const files = generateProjectFiles();

  Object.entries(files).forEach(([name, content]) => zip.file(name, content));
  const blob = await zip.generateAsync({ type: 'blob' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `generated-website-${Date.now()}.zip`;
  a.click();
  URL.revokeObjectURL(url);
};


설명: 외부 CDN 의존 제거로 안정성·보안↑.

4) 관심사 분리(의도 파싱 분리) — 20줄 스켈레톤
// uiGenerator.ts
export type Intent = { header: boolean; hero: boolean; cards: boolean };

export const parseIntent = (input: string): Intent => {
  const s = input.toLowerCase();
  return {
    header: s.includes('header'),
    hero  : s.includes('hero'),
    cards : s.includes('card') || s.includes('feature'),
  };
};

export const buildHtml = (i: Intent) => [
  i.header && `<header class="main-header">...</header>`,
  i.hero   && `<section class="hero">...</section>`,
  i.cards  && `<section class="features">...</section>`,
].filter(Boolean).join('\n');

export const buildCss = (i: Intent) => [
  i.header && `.main-header{...}`,
  i.hero   && `.hero{...}`,
  i.cards  && `.features{...}.feature-card{...}`,
].filter(Boolean).join('\n');


설명: 컴포넌트는 상태/UI만, 로직은 이 모듈에서 테스트 가능.

문서에 꼭 들어가야 할 “한 줄 설명” 셋

왜: XSS·격리·가용성 문제를 막기 위한 최소 보안/안정 패치.

어디: iframe 속성, getFullHTML() 내부 정화, downloadZip() 내부 의존성 변경, 생성 로직 파일 분리.

검증방법: 임의 스크립트 입력 시 실행 안 됨, 오프라인에서도 ZIP 생성, 단위테스트로 parseIntent() 확인.

체크리스트(이 6개면 충분)

 sandbox="allow-scripts" 적용

 DOMPurify로 generatedHTML/CSS 정화

 JSZip npm 의존성으로 교체(CDN 제거)

 오류/로딩 토스트(try/catch) 간단 추가

 parseIntent/buildHtml/buildCss 분리

 README에 “보안/설정 이유” 3줄 요약

이 정도 예시/패치가 들어가면, 다른 개발자도 충분히 이해하고 그대로 적용할 수 있다.
