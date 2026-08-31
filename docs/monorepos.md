# Monorepos

0.1.0 does not read Nx, Turborepo, pnpm-workspace, or package.json `workspaces` graphs.

Declare layers with globs:

```yaml
version: 1

root: "."

layers:
  - name: apps
    paths:
      - "apps/**"

  - name: packages
    paths:
      - "packages/**"

rules:
  - from: packages
    cannotDependOn:
      - apps
```

Cross-package TypeScript path aliases work if a `tsconfig.json` at the analysis root (or above, via TypeScript's config walk) defines `compilerOptions.paths`.

See `examples/monorepo`.
