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

`root` is resolved from the process working directory, then to its real path, so a symlinked checkout is analyzed the same as the directory it points at.

Layer globs are matched against the path relative to `root` first. Only if no layer matches at all are they retried against the project-relative path, so both `domain/**` and `src/domain/**` styles work. The two forms are never mixed within one decision: a file is ambiguous only when two layers claim the same form, not when each claims a different one.

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
- a `tsconfig.json` whose compiler options fail to parse

An unusable `tsconfig.json` stops the run rather than being ignored. Its options are what resolve `baseUrl` and `paths` aliases, so continuing without them would drop every aliased import from the graph and report a clean architecture because the analysis stopped seeing the dependencies. Diagnostics about which files the config selects are not errors here: the analyzer supplies its own file list, so a project-references stub with `"files": []` is analyzed normally.
