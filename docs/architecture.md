# Architecture

Architecture Boundary Check is split so language support can grow without rewriting the rules engine.

```
                 DependencyAnalyzer
                        │
                        ↓
              TypeScript (0.1.0)
                        ↓
              DependencyGraph
                    ↓
              Architecture Core
                    ↓
                 Rules
                    ↓
               Violations
```

## Layers in this repository

| Layer | Path | May depend on |
| --- | --- | --- |
| `core` | `src/core/**` | nothing outside core |
| `analyzers` | `src/analyzers/**` | `core` |
| `config` | `src/config/**` | `core` |
| `cli` | `src/cli/**` | `core`, `analyzers`, `config`, `api` |
| `api` | `src/index.ts`, `src/analyze-architecture.ts`, `src/version.ts` | all of the above |

`core` never prints. The CLI formats `ArchitectureAnalysisResult`.

## Analyzer contract

```ts
export interface DependencyAnalyzer {
  analyze(project: ProjectContext): Promise<DependencyGraph>;
}
```

0.1.0 ships `TypeScriptDependencyAnalyzer`. Later releases can add PHP, Java, C#, and Python analyzers that produce the same graph.

## Graph

Nodes are project-relative source files. Edges are resolved static imports and `export ... from` re-exports. External packages are omitted.

Cycle detection runs Tarjan's algorithm iteratively over the adjacency list and reports one representative cycle per strongly connected component. Every file in a component can reach every other one, so the component is the unit that has to be broken; enumerating every elementary cycle inside it is exponential in the worst case. The traversal is iterative because a dependency chain can be far deeper than the call stack.
