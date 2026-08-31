# Contributing

Thanks for considering a contribution to Architecture Boundary Check.

## Development

Requirements:

- Node.js 20 or newer
- pnpm 10

Useful commands:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

`pnpm check` runs Architecture Boundary Check against this repository.

## Pull requests

- Keep changes focused.
- Run lint, typecheck, tests, and the self architecture check before opening a PR.
- Prefer table-driven tests for validators and rule evaluation.
- Do not execute analyzed source. Parsing only.
- The core package must not print. Formatters live in the CLI.

## Architecture

Language analyzers feed `DependencyGraph`. Rules and cycle detection stay in `src/core`. Do not fold TypeScript AST checks into the rule evaluator.
