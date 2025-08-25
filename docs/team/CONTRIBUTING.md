# Contributing to Navo

Thanks for your interest in contributing!

## Ground Rules

- Keep docs short and link back to `README.md`.
- Prefer plain language; avoid framework wars.
- Include a short “why” in PR descriptions.

## Getting Started

1. Fork and clone the repo
2. Create a feature branch
3. Write clear commits and tests where applicable

### Local Setup

- Node 22.x
- Install deps: `npm install`
- Create `.env.local` as needed

Required environment variables:

- `JWT_SECRET` (required)
- `DATABASE_URL` (required for server start)
- `GEMINI_API_KEY` (optional; required for live AI suggestion generation)

### Scripts

- Dev server: `npm run dev`
- Type-check/build server only: `npm run build:server`
- Full build (server + client bundle): `npm run build`
- Start compiled server: `npm start`
- Drizzle migrations: `npm run db:generate` / `npm run db:push` / `npm run db:pull`

## Development

- Lint/format before pushing
- Keep changes scoped and reviewable

## Reporting Issues

- Describe steps to reproduce and expected behavior
- Attach logs or screenshots if helpful

## License

By contributing, you agree your contributions are licensed under the repository’s license.
