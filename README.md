# Architecture Boundary Check

Enforce architectural dependency boundaries in CI with configurable layer, module, and import constraints.

Architecture Boundary Check analyzes source-level dependencies and verifies that files follow the architectural rules **your team defines**. It fails the build when the dependency graph drifts — for example when domain code imports infrastructure, a controller skips the application layer, or a package reaches into another module's internals.

It does not prescribe Clean Architecture, Hexagonal, DDD, or any other style. You declare the rules. The tool validates them.

[Español](README.es.md)

**Topics:** `architecture` `software-architecture` `typescript` `javascript` `static-analysis` `dependency-analysis` `clean-architecture` `hexagonal-architecture` `ci` `developer-tools` `code-quality` `monorepo`

Architecture Boundary Check performs local static analysis and sends no source code externally.

## What it is for

In a medium or large codebase, illegal dependencies still compile, pass tests, and ship:

```
controller  →  repository
domain      →  infrastructure
payments    →  users/internal/database
```

The architecture still looks fine in a diagram. The code no longer matches it.

This tool turns those constraints into an executable check:

| You declare | CI fails when |
| --- | --- |
| `domain` cannot depend on `infrastructure` | a domain file imports an infrastructure file |
| controllers can only depend on `application` | a controller imports a repository |
| `packages` cannot depend on `apps` | a shared package imports an application |
| cycles are forbidden | `A → B → C → A` |

It is **not** ESLint. It does not care about quotes, unused variables, or naming. It cares about the architecture graph: dependency direction, layer boundaries, and cycles.

## Features (0.1.0)

- TypeScript and JavaScript static analysis (`import` and `export ... from`)
- Relative imports and `tsconfig` `paths` aliases (`@/domain/order`)
- Type-only imports counted as dependencies
- Named layers with glob paths
- `cannotDependOn` and `canOnlyDependOn` (not both on the same rule)
- Circular dependency detection, reported once per unique cycle
- Exceptions with an optional expiry date
- Source ignore globs and `exclude` patterns
- Console report for humans, JSON report for machines
- Exit codes designed for CI (`0` / `1` / `2`)
- YAML or JSON configuration
- Basic monorepo support via globs
- Programmatic API (`analyzeArchitecture`)
- Local-only analysis: source is parsed, never executed

## Installation

```bash
pnpm add -D architecture-boundary-check
```

```bash
npm install --save-dev architecture-boundary-check
```

Requires Node.js 20 or newer. TypeScript is a runtime dependency of the analyzer; you do not need to configure ESLint.

## Quick start

Create `architecture-boundary.yml` at the project root (recommended name):

```yaml
version: 1

layers:
  - name: domain
    paths:
      - "src/domain/**"

  - name: application
    paths:
      - "src/application/**"

  - name: infrastructure
    paths:
      - "src/infrastructure/**"

rules:
  - from: domain
    cannotDependOn:
      - application
      - infrastructure

  - from: application
    cannotDependOn:
      - infrastructure
```

Run:

```bash
npx architecture-boundary-check
```

`architecture-boundary-check` with no subcommand is an alias of `check`.

If the graph is clean:

```
Architecture Boundary Check

Files analyzed:          142
Dependencies:            387
Layers:                    3
Rules:                     2
Cycles:                    0

Violations:                0

Architecture check passed.
```

If domain imports infrastructure:

```
Architecture Boundary Check

Files analyzed:          142
Dependencies:            387
Layers:                    3
Rules:                     2
Cycles:                    0

Violations:                2

[domain → infrastructure]

src/domain/orders/order.service.ts:4:1
  imports
src/infrastructure/database/order.repository.ts

Rule:
domain cannot depend on infrastructure

[application → infrastructure]

src/application/payments/payment.handler.ts:1:1
  imports
src/infrastructure/http/payment.client.ts

Rule:
application cannot depend on infrastructure

Architecture check failed.
```

Exit code: `1`. The pull request fails.

## CLI

```
Usage:
  architecture-boundary-check [check] [options]

Options:
  --config <path>   Path to architecture-boundary.yml
  --format <type>   console (default) | json
  --help            Show help
  --version         Show version

Exit codes:
  0  Success
  1  Architecture violations (or forbidden cycles)
  2  Configuration or execution error
```

Examples:

```bash
npx architecture-boundary-check
npx architecture-boundary-check check
npx architecture-boundary-check check --config ./config/architecture.yaml
npx architecture-boundary-check --format json
```

The CLI looks for, in order:

1. `architecture-boundary.yml` (recommended)
2. `architecture-boundary.yaml`
3. `architecture-boundary.json`

## Configuration

`root` is the directory to scan. Layer globs are matched relative to that root, so both of these styles work:

```yaml
root: "src"
layers:
  - name: domain
    paths:
      - "domain/**"
```

```yaml
root: "."
layers:
  - name: domain
    paths:
      - "src/domain/**"
```

A file belongs to at most one layer. Matching two layers is a configuration error (exit `2`). A file that matches none is **unclassified** and is not a violation in 0.1.0.

Use **either** `cannotDependOn` **or** `canOnlyDependOn` on a given rule:

```yaml
rules:
  - from: domain
    cannotDependOn:
      - application
      - infrastructure

  - from: presentation
    canOnlyDependOn:
      - application
      - presentation
```

Declaring both on the same rule is rejected before any file is parsed.

External packages (`import { z } from 'zod'`) are ignored. This tool checks internal architecture, not the npm graph.

### Cycles

Cycles are always listed in the report. They fail the check only when you opt in:

```yaml
cycles:
  forbidden: true
```

Default: `false`.

### Excludes, ignores, and exceptions

Skip test files and build output:

```yaml
exclude:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "dist/**"
  - "node_modules/**"
```

Ignore an entire legacy tree:

```yaml
ignore:
  - source: "src/legacy/**"
```

Allow a temporary, dated exception. When the date passes, configuration loading fails with `Architecture exception expired`:

```yaml
exceptions:
  - from: domain
    to: infrastructure
    source:
      - "src/domain/legacy/**"
    reason: "Legacy migration"
    expires: "2026-12-31"
```

`node_modules`, `dist`, `build`, `coverage`, and `.git` are skipped by default. `.gitignore` is applied when present.

Full schema: [docs/configuration.md](docs/configuration.md). Rules: [docs/rules.md](docs/rules.md).

## CI

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  architecture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Architecture boundaries
        run: pnpm architecture-boundary-check
```

JSON for dashboards or custom reporters:

```bash
architecture-boundary-check --format json
```

```json
{
  "files": 284,
  "dependencies": 931,
  "violations": [
    {
      "source": "src/domain/order.ts",
      "target": "src/infrastructure/order.repository.ts",
      "sourceLayer": "domain",
      "targetLayer": "infrastructure",
      "rule": "domain cannot depend on infrastructure",
      "importSpecifier": "../infrastructure/order.repository",
      "line": 4,
      "column": 1
    }
  ],
  "cycles": []
}
```

## Monorepos

0.1.0 does not read Nx, Turborepo, or pnpm workspace graphs. Globs are enough for app vs package boundaries:

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

See [docs/monorepos.md](docs/monorepos.md) and `examples/monorepo`.

## Examples

| Example | What it demonstrates |
| --- | --- |
| [examples/clean-architecture](examples/clean-architecture) | `presentation → application → domain`, infrastructure only depends on domain |
| [examples/modular-monolith](examples/modular-monolith) | feature modules may use `shared`; `shared` cannot depend on features |
| [examples/monorepo](examples/monorepo) | apps may depend on packages; packages cannot depend on apps |

From an example directory:

```bash
npx architecture-boundary-check
```

## Programmatic API

The core returns data. It does not print.

```ts
import { analyzeArchitecture } from 'architecture-boundary-check';

const result = await analyzeArchitecture({
  rootDirectory: process.cwd(),
  config,
});

if (result.violations.length > 0) {
  process.exitCode = 1;
}
```

## How it works

```
TypeScript / JavaScript sources
        ↓
TypeScript Compiler API  (parse + resolveModuleName)
        ↓
Dependency Graph         (file → file)
        ↓
Architecture Engine      (layers, rules, cycles)
        ↓
Violations / report / exit code
```

The engine never inspects an AST. A future PHP or Java analyzer can feed the same graph.

This repository dogfoods the tool: `core` cannot depend on `cli`, `analyzers`, or `config`. See [docs/architecture.md](docs/architecture.md).

## Security

- Analysis is local. There is no network client, telemetry, or remote API.
- Source files are parsed. They are never loaded with `import()` or `require()` as executable modules.
- Symlinks that resolve outside the project root are ignored.

## Limitations (0.1.0)

Supported:

- TypeScript and JavaScript
- Static `import` and `export ... from`
- Relative specifiers and `tsconfig` `baseUrl` / `paths`
- Type-only imports
- Layers, `cannotDependOn`, `canOnlyDependOn`
- Cycle detection
- Exceptions with optional expiry
- Console and JSON output

Not in this version:

- `import()` dynamic imports
- CommonJS `require()`
- Following re-export chains past the file that was actually imported
- Module public vs internal APIs (`payments/index.ts` vs `payments/internal/**`)
- Baseline / “no new violations” for legacy codebases
- GitHub Actions `::error` annotations
- Allow/deny lists for npm packages (`domain` must not import `prisma`)
- `strictClassification` (every file must belong to a layer)
- PHP, Java, C#, Python, Go
- Nx / Turborepo project-graph integration
- Persistent cache or worker pools

Details: [docs/limitations.md](docs/limitations.md).

## Testing

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

`pnpm check` runs Architecture Boundary Check against this repository.

## Roadmap

**0.2.0:** baseline (`architecture-boundary-check baseline`), GitHub Actions annotations, module public/internal boundaries, dynamic imports, CommonJS `require`, external dependency allow/deny lists.

**0.3.0+:** PHP, then Java, C#, and Python analyzers behind the same `DependencyAnalyzer` contract.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
