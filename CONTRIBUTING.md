# Contributing to SkillShield

Thank you for helping improve SkillShield. Contributions should be focused, tested, and aligned with the project's pre-install security review goals.

## Before you begin

- Search existing issues before reporting a bug or proposing a feature.
- Open an issue before starting a substantial change so the scope can be agreed on first.
- Review the [roadmap](ROADMAP.md) for current priorities.

## Development setup

1. Fork and clone the repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` if your work requires environment-specific configuration.
4. Start the development server:

   ```bash
   npm run dev
   ```

## Verification

Run the relevant tests while developing. Before submitting a pull request, run the complete local verification suite:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Add or update tests when a change affects behavior. API routes, CLI behavior, validation rules, and security-sensitive logic should include coverage appropriate to the change.

## Pull request guidelines

- Create a focused branch from `main`.
- Keep each pull request limited to one feature or fix.
- Explain the problem, the chosen solution, and how the change was verified.
- Update documentation when behavior or public interfaces change.
- Use a Conventional Commits-style title, such as `feat:`, `fix:`, `docs:`, or `chore:`.

## Code style

- Use TypeScript and follow the existing strict compiler settings.
- Follow the established patterns in the surrounding code.
- Use `import type` for type-only imports.
- Use `camelCase` for variables and functions, `PascalCase` for types and components, and `kebab-case` for filenames.
- Treat `npm run lint` and `npm run typecheck` as the authoritative style and type checks.
