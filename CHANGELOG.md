# Changelog

All notable changes to this project are documented in this file.

## 0.1.0 - 2026-09-18

Initial release of Architecture Boundary Check.

- TypeScript/JavaScript static import and `export ... from` analysis
- `tsconfig` path alias resolution via the TypeScript Compiler API
- Configurable layers, `cannotDependOn`, and `canOnlyDependOn`
- Circular dependency detection, one cycle reported per strongly connected component
- YAML/JSON configuration with validation before analysis, rejecting unknown keys
- Exceptions with optional expiry, scoped by `files`, plus `ignore` source globs
- Console and JSON reporters, the JSON one stating the verdict in `passed`
- Exit codes 0 (success), 1 (violations), 2 (configuration/execution error)
- A run that analyzes nothing, or classifies nothing while rules exist, fails rather than passing
- `--root` to analyze a project other than the working directory
- CLI (`architecture-boundary-check` / `check`) and programmatic `analyzeArchitecture`
- Clean Architecture, modular monolith, and monorepo examples
- Dogfooded architecture check of this repository
- Published as `@erickmorales91/architecture-boundary-check`; the CLI is still `architecture-boundary-check`

### Pre-release hardening

Four review rounds ran against 0.1.0 before it shipped. Nothing below ever
reached a published version, but the defects are recorded because they share a
shape worth remembering: almost every one made the tool **report a pass by
having stopped looking**, not by finding a clean project. For a tool whose only
job is to fail when something is wrong, that is the failure mode that matters.

**Round one — analysis correctness**

- `walk()` followed a directory link back to an ancestor and recursed forever; the CLI burned 90 seconds with no output instead of failing. Directories are de-duplicated by real path and the walk is iterative. The guard covers plain directories too, since Windows reports a junction as a directory rather than a link.
- `detectCycles()` reported one cycle per DFS back-edge while the docs promised every unique cycle, and recursed deep enough to blow the call stack at 15k files. It now runs Tarjan iteratively and reports one representative cycle per strongly connected component, which is the unit that has to be broken; the docs say that instead of promising completeness.
- An excluded file still entered the graph as an import target, producing violations and inflating the file count. Edges into files outside the discovered set are dropped, the way external packages already were.
- Discovery canonicalized the project root while the analyzer measured against the path it was handed, so a symlinked checkout, a Windows 8.3 short name or macOS `/tmp` reported zero dependencies and passed a project that violates its own rules. Both stages share one canonical root.
- CI declared pnpm twice and failed with `ERR_PNPM_BAD_PM_VERSION`; a Windows leg was added, because the link bug only reproduces there and CI never ran it.

**Round two — paths and configuration**

- An unusable `tsconfig.json` was ignored rather than fatal. Its options are what resolve `baseUrl` and `paths`, so the run continued with every aliased import missing from the graph and reported a clean architecture. Parse failures now stop the run; diagnostics about which files the config selects do not, so a project-references stub with `"files": []` still analyzes.
- Layer globs were matched against two path forms at once, so two layers could match through two different normalizations and the file was rejected as ambiguous when only one layer really claimed it. The forms are tried in separate passes.
- `normalizeRelativePath` dropped a leading `..` that had nothing to consume, forging a path that looked like it sat inside the project and could match a layer glob.
- Argument parsing let a later malformed flag fail the very command that explains the flags, and consumed the next flag as a missing value, blaming the wrong one. `--help` wins immediately and a value that looks like a flag is rejected rather than swallowed.
- The CLI process suite timed out under the full test run while passing in isolation: each case spawns `node --import tsx` before the CLI runs at all.

**Round three — validation, reporting and cost**

- The validator accepted keys it does not read. `excludes` instead of `exclude` scanned everything, and a misspelled `files` on an exception lost its file filter, widening a one-file exception into an amnesty for the whole layer pair. Unknown keys are rejected and named by their path in the config.
- `expires` accepted a value matching `YYYY-MM-DD` but not the calendar. `2026-13-45` never sorts before today, so the deadline its author wrote down quietly became permanent.
- Discovery recorded a symlinked source file under its link path while the analyzer resolves every import target to its real path, so nothing matched and each edge into that file was dropped in silence.
- Two rules forbidding the same pair each reported the same edge, inflating the count. Violations are keyed on their full identity, so rules that describe an edge differently still both appear.
- The JSON report could not express its own verdict: a forbidden cycle fails a run whose `violations` array is empty, and `cycles.forbidden` lives in the configuration. The report carries `passed` and `cyclesForbidden`.
- `files` is the canonical exception field; `source` had been documented in its place in one of two files and stays an accepted alias.
- Cost: exception globs were compiled once per dependency and are now compiled once; adjacency de-duplicates through a set instead of scanning an array, keeping insertion order so cycle reports stay stable; files are read through a bounded concurrency window sharing one module resolution cache.

**Round four — the empty run**

A last review round asked the one question the first three had not: what does
the tool do when it analyzes *nothing*? It printed `Architecture check passed`
and exited 0 — in four separate ways, each of them a one-line mistake that turns
a CI gate into a no-op nobody notices.

- A typo in `root` pointed the scan at a directory that does not exist. Zero files, zero violations, exit 0, forever.
- An `exclude` glob wide enough to cover the source tree did the same.
- `--config` pointing at another project's configuration analyzed the working directory instead, because the analysis root was always `cwd` and nothing could move it.
- Layer globs that claim no file left every rule inert: rules are keyed on layer names, so a file no layer claims is a file no rule can reach. Six files analyzed, zero classified, exit 0.

A run that analyzed nothing, or that classified nothing while rules are
configured, is now a configuration error (exit 2) with a message naming the
`root`, the exclusions or the layer globs that explain the emptiness. The
reports carry `Files classified` / `filesClassified` beside the file count, so
the difference between a working check and an inert one is visible without
reading the configuration. `--root <path>` selects the project to analyze.
