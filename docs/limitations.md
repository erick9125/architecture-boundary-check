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
- enumerating every elementary cycle inside a strongly connected component

Cycles are reported one per strongly connected component rather than one per elementary cycle. If `a → b → c → a` and `a → c → a` both exist, they are the same component and appear once: breaking the component is a single piece of work, and the number of elementary cycles in a dense component grows exponentially.

Symlinks that resolve outside the project root are ignored so analysis cannot walk arbitrary filesystem locations. A link that resolves back inside the project is followed at most once, so a link pointing at one of its own ancestors cannot loop.

`exclude` removes a file from the analysis entirely. An excluded file is not scanned, and an import that resolves to it is dropped rather than reported, the same way an import of an external package is.
