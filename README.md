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

2. **Install dependencies**

   ```bash
   npm install
   cd frontend && npm install
   cd ..
   ```

3. **Environment setup**

   ```bash
   cp .env.example .env
   # Edit .env with your database and API credentials
   ```

4. **Database setup**

   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Build and run**

   ```bash
   # Build everything (server + React frontend)
   npm run build:full

   # Start the server
   npm start
   ```

## 📚 Available Scripts

### Build Commands

```bash
npm run build:server      # Build TypeScript server only
npm run build:react       # Build React frontend only
npm run build:full        # Build both server and React frontend
npm run build             # Build TypeScript backend
```

### Development Commands

```bash
npm run dev               # Start backend dev server
npm run dev:react         # Next.js development server (recommended)
npm start                 # Start production server
```

### Database Commands

```bash
npm run db:generate       # Generate database migrations
npm run db:push           # Push schema changes to database
npm run db:pull           # Introspect database schema
```

## 🏛️ Project Structure

```
navo/
├── frontend/                 # React/Next.js frontend
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   ├── components/      # React components
│   │   ├── context/         # React contexts
│   │   ├── hooks/           # Custom hooks
│   │   └── lib/             # Utilities and API
│   ├── postcss.config.mjs   # Tailwind CSS v3 PostCSS 설정
│   └── package.json
├── navo/                     # Backend source code
│   ├── agents/              # AI agents
│   ├── auth/                # Authentication
│   ├── core/                # Core functionality
│   ├── db/                  # Database layer
│   ├── handlers/            # API handlers
│   ├── middleware/          # Express middleware
│   ├── nodes/               # Workflow nodes
│   └── routes/              # API routes
├── config/                   # Configuration files
├── docs/                     # Documentation
└── package.json              # Root package.json
```

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/navo

# Server
PORT=3001
HOST=0.0.0.0

# AI Integration
GEMINI_API_KEY=your_gemini_api_key_here

# Frontend (Client-side accessible)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# Backend (Server-side only)
API_BASE_URL=http://localhost:3001
```

**중요**: API URL 환경 변수 사용 가이드라인

- **Frontend**: `NEXT_PUBLIC_API_BASE_URL` 사용 (클라이언트에서 접근 가능)
- **Backend**: `API_BASE_URL` 사용 (서버에서만 접근)

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
