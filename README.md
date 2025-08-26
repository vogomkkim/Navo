# Navo - AI-Powered Website Builder

A modern, AI-powered website building platform that combines the power of artificial intelligence with intuitive design tools.

## 🚀 **NEW: React Frontend Migration Complete!**

The project has been successfully migrated from a webpack-based frontend to a modern **React/Next.js** architecture, providing:

- ✨ **Modern Development Experience** with React 19 and Next.js 15
- 🔒 **Full Type Safety** with TypeScript
- ⚡ **Optimized Performance** with Next.js App Router
- 🎨 **Beautiful UI** with Tailwind CSS
- 🔄 **Real-time Updates** with React Query

## 🏗️ Architecture

- **Backend**: Fastify + TypeScript + Drizzle ORM
- **Frontend**: React 19 + Next.js 15 + TypeScript + Tailwind CSS
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
DATABASE_URL=postgresql://user:password@localhost:5432/navo

# AI Integration
GEMINI_API_KEY=your_gemini_api_key

# Server
PORT=3000
NODE_ENV=development
```

### Database Schema

The database schema is managed through Drizzle ORM with automatic migrations. See `config/drizzle.config.ts` for configuration.

## 🧪 Testing

```bash
# Run frontend tests
npm run test

# Run backend tests (if available)
npm run test:server
```

## 📖 Documentation

- [React Frontend Migration Guide](docs/progress/react-frontend-migration-complete.md)
- [Architecture Overview](docs/tech/architecture.md)
- [API Documentation](docs/api/README.md)
- [Development Guide](docs/development/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation in the `docs/` folder
- Review the migration guide for frontend development

---

**Navo** - Building the future of web development, one AI-powered component at a time. 🚀
