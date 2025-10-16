# Navo - AI-Powered Website Builder

A modern, AI-powered website building platform that combines the power of artificial intelligence with intuitive design tools.

## 🚀 **NEW: React Frontend Migration Complete!**

The project has been successfully migrated to a modern **React/Next.js** architecture, providing:

- ✨ **Modern Development Experience** with React 19 and Next.js 15
- 🔒 **Full Type Safety** with TypeScript
- ⚡ **Optimized Performance** with Next.js App Router
- 🎨 **Beautiful UI** with **Tailwind CSS v3.4.17** (Stable)
- 🔄 **Real-time Updates** with React Query

## 🎨 **Tailwind CSS v3.4.17**

### **✅ 안정적인 v3 버전 사용**

이 프로젝트는 **Tailwind CSS v3.4.17**을 사용합니다. 안정적이고 검증된 버전입니다.

### **🔧 v3 설정 방법**

```bash
# 1. 설치 (v3 패키지)
npm install -D tailwindcss@3.4.17 postcss autoprefixer

# 2. PostCSS 설정 (postcss.config.mjs)
export default {
  plugins: ["tailwindcss", "autoprefixer"],
};

# 3. CSS에서 가져오기 (globals.css)
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### **✅ v3의 장점**

- **안정성** - 검증된 버전으로 안정적인 빌드
- **호환성** - Vercel 등 모든 플랫폼에서 문제없이 작동
- **풍부한 생태계** - 다양한 플러그인과 도구 지원
- **문서화** - 완전한 문서와 커뮤니티 지원

## 🏗️ Architecture

- **Backend**: Fastify + TypeScript + Drizzle ORM
- **Frontend**: React 19 + Next.js 15 + TypeScript + **Tailwind CSS v3.4.17**
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: Google Gemini AI for content generation
- **Authentication**: JWT-based authentication system

## 🚀 Quick Start

### Prerequisites

- Node.js 22.x
- PostgreSQL database
- Google Gemini API key

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Navo
   ```

2. **Install dependencies (monorepo workspaces)**

   ```bash
   # Installs root + all workspaces (server, frontend, packages)
   npm install
   ```

3. **Environment setup**

   - Server env (create `server/.env` or `server/.env.local`):

     ```env
     # PostgreSQL
     DB_HOST=localhost
     DB_PORT=5432
     DB_USER=postgres
     DB_PASSWORD=
     DB_NAME=navo

     # Server
     PORT=3001

     # AI
     GEMINI_API_KEY=your_gemini_api_key_here
     ```

   - Frontend env (create `frontend/.env.local`):

     ```env
     NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
     ```

4. **Database setup (Drizzle ORM)**

   From the repo root:

   ```bash
   npm run db:generate -w @navo/server
   npm run db:push -w @navo/server
   # (Alternatively) cd server && npm run db:generate && npm run db:push
   ```

5. **Run in development**

   ```bash
   # Terminal 1: backend (Fastify)
   cd server && pnpm dev

   # Terminal 2: frontend (Next.js)
   cd frontend && pnpm dev
   ```

6. **Production build and start**

   ```bash
   # Backend
   cd server && pnpm build
   cd server && pnpm start

   # Frontend
   cd frontend && pnpm build
   cd frontend && pnpm start
   ```

## 📚 Available Scripts

### Root (monorepo)

```bash
pnpm build                  # Build all workspaces
pnpm lint                   # Lint all workspaces
pnpm format                 # Format all workspaces
pnpm clean                  # Clean all node_modules

# Database operations
pnpm db:generate            # Generate Drizzle migrations
pnpm db:push                # Push schema to DB
pnpm db:pull                # Introspect database
```

### Server workspace (`@navo/server`)

```bash
cd server && pnpm dev       # Start dev server
cd server && pnpm build     # Build server
cd server && pnpm start     # Start production server
cd server && pnpm test       # Run tests
cd server && pnpm test:run   # Run tests (CI mode)
```

### Frontend workspace (`frontend`)

```bash
cd frontend && pnpm dev     # Next.js dev server (http://localhost:3000)
cd frontend && pnpm build   # Build frontend
cd frontend && pnpm start   # Start production frontend
cd frontend && pnpm test     # Run tests
cd frontend && pnpm test:run # Run tests (CI mode)
```

## 🏛️ Project Structure

```
navo/
├── frontend/                 # React/Next.js frontend
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities and API
│   │   └── (ui, hooks, etc.)
│   ├── postcss.config.mjs   # Tailwind CSS v3 PostCSS 설정
│   └── package.json
├── server/                   # Fastify + TypeScript backend
│   ├── src/
│   │   ├── server.ts        # Entry point
│   │   ├── core/            # Core logic (routers, utilities)
│   │   ├── lib/             # Logger, error handling, helpers
│   │   ├── modules/         # Features (auth, projects, pages, components, ...)
│   │   └── types/           # Shared types
│   ├── drizzle/             # Drizzle schema and migrations
│   └── package.json
├── packages/
│   └── shared/              # Shared utilities (if any)
├── docs/                     # Documentation
└── package.json              # Root package.json
```

## 🔧 Configuration

### Environment Variables

Server (`server/.env` or `server/.env.local`):

```env
# Database (Drizzle + PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=
DB_NAME=navo

# Server
PORT=3001

# AI Integration
GEMINI_API_KEY=your_gemini_api_key_here
```

Frontend (`frontend/.env.local`):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

**중요**: API URL 환경 변수 사용 가이드라인

- **Frontend**: `NEXT_PUBLIC_API_BASE_URL` 사용 (클라이언트에서 접근 가능)
- **Backend**: 별도 API URL 환경변수는 필요하지 않으며 서버는 `PORT`로 구동됩니다

### Tailwind CSS v3 Configuration

**중요**: 이 프로젝트는 Tailwind CSS v3.4.17을 사용합니다.

- **설정 파일**: `tailwind.config.js` 사용
- **PostCSS 설정**: `postcss.config.mjs`에서 `tailwindcss`, `autoprefixer` 사용
- **CSS 가져오기**: `@tailwind base; @tailwind components; @tailwind utilities;` 사용

## 🎯 Key Features

- **AI-Powered Project Generation**: Generate complete projects using AI agents
- **Multi-Agent Workflow**: Strategic planning, development, QA, and DevOps
- **Modern Tech Stack**: React 19, Next.js 15, TypeScript, Tailwind CSS v3.4.17
- **Real-time AI Chat**: Interactive project planning and development
- **Database Integration**: PostgreSQL with Drizzle ORM
- **Authentication System**: JWT-based user management

## 🚨 Troubleshooting

### Tailwind CSS v3 Issues

- **"Cannot apply unknown utility class"**: `tailwind.config.js`에서 `content` 배열 확인
- **"Module not found: tailwindcss/preflight"**: v3에서는 `@tailwind base; @tailwind components; @tailwind utilities;` 사용
- **빌드 오류**: `tailwindcss`, `autoprefixer` 패키지가 설치되어 있는지 확인

### Common Issues

- **Port conflicts**: Ensure ports 3001 (backend) and 3000 (frontend) are available
- **Database connection**: Check PostgreSQL service and connection string
- **API errors**: Verify Gemini API key and environment variables

## 📚 Documentation

- [Frontend README](frontend/README.md) - Detailed frontend setup and usage
- [API Documentation](docs/api.md) - Backend API endpoints
- [AI Agent System](docs/ai-project-orchestrator-agent.md) - AI workflow details
- [Tailwind CSS v3 Guide](https://tailwindcss.com/docs) - Official v3 documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Navo** - Building the future of web development with AI! 🚀✨
