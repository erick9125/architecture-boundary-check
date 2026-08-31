# Limitations (0.1.0)

Supported:

- TypeScript and JavaScript
- static `import` declarations
- `export ... from` re-exports
- relative specifiers
- `tsconfig` `baseUrl` / `paths` aliases via `typescript.resolveModuleName`
- type-only imports (counted as dependencies)
- glob layers, `cannotDependOn`, `canOnlyDependOn`
- cycle detection
- configurable exceptions with optional expiry
- console and JSON reports
- YAML and JSON config

Not supported yet:

- `import()` dynamic imports
- CommonJS `require()`
- following re-export chains past the directly imported file
- module public vs internal APIs
- baseline / "no new violations"
- GitHub Actions `::error` annotations
- external package allow/deny lists
- `strictClassification` (every file must belong to a layer)
- PHP, Java, C#, Python, Go
- persistent caches and worker pools

Symlinks that resolve outside the project root are ignored so analysis cannot walk arbitrary filesystem locations.
