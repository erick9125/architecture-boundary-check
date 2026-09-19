# Contributing

Thanks for considering a contribution to Architecture Boundary Check.

## Development

Requirements:

- Node.js 20 or newer
- npm 10 (pnpm also works; `package-lock.json` is the lockfile under version control)

Useful commands:

```bash
npm install
npm run check:full
```

`npm run check:full` runs lint, typecheck, coverage, build, the tool against this repository, and the package verification. It is what CI and `prepublishOnly` run, so a green `check:full` is a green pull request.

## Pull requests

- Keep changes focused.
- Run lint, typecheck, tests, and the self architecture check before opening a PR.
- Prefer table-driven tests for validators and rule evaluation.
- Do not execute analyzed source. Parsing only.
- The core package must not print. Formatters live in the CLI.

## Architecture

Language analyzers feed `DependencyGraph`. Rules and cycle detection stay in `src/core`. Do not fold TypeScript AST checks into the rule evaluator.
