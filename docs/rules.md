# Rules

Each rule has a `from` layer and exactly one constraint type.

## cannotDependOn

The source layer may depend on any classified layer except the listed ones.

```yaml
- from: domain
  cannotDependOn:
    - application
    - infrastructure
```

## canOnlyDependOn

The source layer may depend only on the listed layers (usually including itself).

```yaml
- from: application
  canOnlyDependOn:
    - domain
    - application
```

## Invalid combination

This configuration is rejected before any file is parsed:

```yaml
- from: domain
  cannotDependOn:
    - infrastructure
  canOnlyDependOn:
    - domain
```

## Unclassified files

If the source or the target has no layer, the edge is skipped. That covers:

- files outside your layer map
- unresolved or external packages (those never enter the graph)

## Type-only imports

`import type { User } from '../users/user'` counts as a dependency. It still couples one module to another module's types.

## Exceptions

An exception suppresses matching violations until `expires` (inclusive, UTC date `YYYY-MM-DD`).

```yaml
exceptions:
  - from: application
    to: infrastructure
    files:
      - "src/application/legacy-adapter.ts"
    reason: "Legacy dependency pending migration"
    expires: "2026-12-31"
```
