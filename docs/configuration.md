# Configuration

Recommended file name: `architecture-boundary.yml`.

Also accepted: `architecture-boundary.yaml`, `architecture-boundary.json`.

## Schema (0.1.0)

```yaml
version: 1

root: "src"

layers:
  - name: domain
    paths:
      - "domain/**"

  - name: application
    paths:
      - "application/**"

  - name: infrastructure
    paths:
      - "infrastructure/**"

rules:
  - from: domain
    cannotDependOn:
      - application
      - infrastructure

  - from: application
    cannotDependOn:
      - infrastructure

cycles:
  forbidden: false

exclude:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "dist/**"
  - "node_modules/**"

ignore:
  - source: "src/legacy/**"

exceptions:
  - from: domain
    to: infrastructure
    source:
      - "src/domain/legacy/**"
    reason: "Legacy migration"
    expires: "2026-12-31"
```

`root` is resolved from the process working directory. Layer globs are matched against the path relative to `root`, and also against the project-relative path so both `domain/**` and `src/domain/**` styles work.

## Defaults

These directories are skipped even if `exclude` is omitted: `node_modules`, `dist`, `build`, `coverage`, `.git`.

An excluded file leaves the analysis completely: it is not scanned, it is not counted in `Files analyzed`, and an import that resolves to it is dropped instead of being reported as a violation. Use `ignore` instead when you want a file to keep participating in the graph but stop producing violations of its own.

`.gitignore` is applied when present. You do not need a complete gitignore implementation for 0.1.0, but the common ignore file is honored.

`cycles.forbidden` defaults to `false`.

## Validation errors (exit 2)

Reported before analysis:

- version other than `1`
- duplicate or empty layer names
- empty path globs
- unknown layer in a rule or exception
- `cannotDependOn` and `canOnlyDependOn` on the same rule
- repeated layer in a dependency list
- expired exception
- missing configuration file
- a source file matching more than one layer
