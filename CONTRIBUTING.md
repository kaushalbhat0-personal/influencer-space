# Contributing to CreatorStore

## Getting Started

1. Fork the repository.
2. Clone your fork.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and fill in required values.
5. Run `npm run dev` to start the development server.

## Development Workflow

1. Create a branch: `git checkout -b feature/your-feature`
2. Make your changes.
3. Run `npm run lint` to check for ESLint errors.
4. Run `npm test` to verify tests pass.
5. Run `npx tsc --noEmit` to verify TypeScript.
6. Run `npm run build` to verify production build.
7. Push and open a pull request.

## Code Standards

- TypeScript strict mode
- Use existing patterns from the codebase
- No `as any` type casts
- No `console.log` in production code
- Server actions use `"use server"`
- Client components use `"use client"`

## Commit Messages

Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
