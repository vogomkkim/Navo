# Navo - AI-Powered Website Builder

A modern, AI-powered website building platform that combines the power of artificial intelligence with intuitive design tools.

## 🚀 **NEW: React Frontend Migration Complete!**

The project has been successfully migrated from a webpack-based frontend to a modern **React/Next.js** architecture, providing:

- ✨ **Modern Development Experience** with React 19 and Next.js 15
- 🔒 **Full Type Safety** with TypeScript
- ⚡ **Optimized Performance** with Next.js App Router
- 🎨 **Beautiful UI** with **Tailwind CSS v4.0** (Latest!)
- 🔄 **Real-time Updates** with React Query

## 🎨 **Tailwind CSS v4.0 (중요!)**

### **⚠️ 주의사항**

이 프로젝트는 **Tailwind CSS v4.0**을 사용합니다. v3와는 완전히 다른 설정 방식입니다!

### **🔧 v4 설정 방법**

```bash
# 1. 설치 (v4 전용 패키지)
npm install -D tailwindcss@next @tailwindcss/postcss

# 2. PostCSS 설정 (postcss.config.mjs)
export default {
  plugins: ["@tailwindcss/postcss"],
};

# 3. CSS에서 가져오기 (globals.css)
@import "tailwindcss";
```

### **❌ v4에서 사용하지 않는 것들**

- `tailwind.config.js` - 불필요 (zero configuration)
- `@tailwind base; @tailwind components; @tailwind utilities;` - v3 문법
- `npx tailwindcss init` - 작동 안 함 (bin 파일 없음)

### **✅ v4의 장점**

- **Zero configuration** - 설정 파일 불필요
- **자동 컨텐츠 감지** - `content` 배열 설정 불필요
- **빠른 빌드** - v3 대비 5.6배 빠름
- **CSS-first 방식** - 설정을 CSS에서 직접 관리

## 🏗️ Architecture

- **Backend**: Fastify + TypeScript + Drizzle ORM
- **Frontend**: React 19 + Next.js 15 + TypeScript + **Tailwind CSS v4.0**
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
npm run build             # Legacy webpack build (deprecated)
```

### Development Commands

```bash
npm run dev               # Legacy webpack dev server
npm run dev:react         # Next.js development server (recommended)
npm start                 # Start production server
```

### Database Commands

```bash
npm run db:generate       # Generate database migrations
npm run db:push           # Push schema changes to database
npm run db:pull           # Introspect database schema
```

### Other Commands

```bash
npm run test              # Run React frontend tests
npm run lint              # ESLint code checking
npm run format            # Prettier code formatting
npm run demo              # Run demo application
```

## 🌐 Development Workflow

### Frontend Development (Recommended)

```bash
# Terminal 1: Start React dev server
npm run dev:react

# Terminal 2: Start backend server
npm start
```

### Full Stack Development

```bash
# Build everything
npm run build:full

# Start production server
npm start
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
│   ├── postcss.config.mjs   # Tailwind CSS v4 PostCSS 설정
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

# Frontend
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### Tailwind CSS v4 Configuration

**중요**: 이 프로젝트는 Tailwind CSS v4.0을 사용합니다.

- **설정 파일 불필요**: `tailwind.config.js` 없음
- **PostCSS 설정**: `postcss.config.mjs`에서 `@tailwindcss/postcss` 사용
- **CSS 가져오기**: `@import "tailwindcss"` 단일 라인

## 🎯 Key Features

- **AI-Powered Project Generation**: Generate complete projects using AI agents
- **Multi-Agent Workflow**: Strategic planning, development, QA, and DevOps
- **Modern Tech Stack**: React 19, Next.js 15, TypeScript, Tailwind CSS v4
- **Real-time AI Chat**: Interactive project planning and development
- **Database Integration**: PostgreSQL with Drizzle ORM
- **Authentication System**: JWT-based user management

## 🚨 Troubleshooting

### Tailwind CSS v4 Issues

- **"Cannot apply unknown utility class"**: 커스텀 클래스는 CSS에서 직접 정의
- **"Module not found: tailwindcss/preflight"**: v4에서는 `@import "tailwindcss"` 사용
- **빌드 오류**: `@tailwindcss/postcss` 패키지가 설치되어 있는지 확인

### Common Issues

- **Port conflicts**: Ensure ports 3001 (backend) and 3000 (frontend) are available
- **Database connection**: Check PostgreSQL service and connection string
- **API errors**: Verify Gemini API key and environment variables

## 📚 Documentation

- [Frontend README](frontend/README.md) - Detailed frontend setup and usage
- [API Documentation](docs/api.md) - Backend API endpoints
- [AI Agent System](docs/ai-project-orchestrator-agent.md) - AI workflow details
- [Tailwind CSS v4 Guide](https://tailwindcss.com/blog/tailwindcss-v4) - Official v4 documentation

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
