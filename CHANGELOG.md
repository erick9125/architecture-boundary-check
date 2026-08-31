# Changelog

All notable changes to this project are documented in this file.

## 0.1.0 - unreleased

Initial release of Architecture Boundary Check.

- TypeScript/JavaScript static import and `export ... from` analysis
- `tsconfig` path alias resolution via the TypeScript Compiler API
- Configurable layers, `cannotDependOn`, and `canOnlyDependOn`
- Circular dependency detection with de-duplicated cycles
- YAML/JSON configuration with validation before analysis
- Exceptions with optional expiry and source ignore globs
- Console and JSON reporters
- Exit codes 0 (success), 1 (violations), 2 (configuration/execution error)
- CLI (`architecture-boundary-check` / `check`) and programmatic `analyzeArchitecture`
- Clean Architecture, modular monolith, and monorepo examples
- Dogfooded architecture check of this repository
