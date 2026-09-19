# Architecture Boundary Check

Hace cumplir los límites de dependencia arquitectónica en CI, con capas, módulos y reglas de importación configurables.

Architecture Boundary Check analiza dependencias a nivel de código y comprueba que los archivos sigan las reglas arquitectónicas **que define tu equipo**. Falla el build cuando el grafo se desvía: dominio que importa infraestructura, un controlador que salta a un repositorio, o un paquete que entra en los internos de otro módulo.

No impone Clean Architecture, Hexagonal ni DDD. Tú declaras las reglas. La herramienta las valida.

[English](README.md)

**Topics:** `architecture` `software-architecture` `typescript` `javascript` `static-analysis` `dependency-analysis` `clean-architecture` `hexagonal-architecture` `ci` `developer-tools` `code-quality` `monorepo`

Architecture Boundary Check realiza análisis estático local y no envía código fuente a ningún servicio externo.

## Para qué sirve

En un proyecto mediano o grande, las dependencias ilegales siguen compilando, pasando tests y llegando a producción:

```
controller  →  repository
domain      →  infrastructure
payments    →  users/internal/database
```

La arquitectura sigue existiendo en un documento. El código ya no la respeta.

Esta herramienta convierte esas restricciones en un check ejecutable:

| Declaras | CI falla cuando |
| --- | --- |
| `domain` no puede depender de `infrastructure` | un archivo de dominio importa infraestructura |
| los controladores solo pueden depender de `application` | un controlador importa un repositorio |
| `packages` no puede depender de `apps` | un paquete compartido importa una aplicación |
| los ciclos están prohibidos | `A → B → C → A` |

**No** es ESLint. No mira comillas, variables sin usar ni nombres. Mira el grafo: dirección de dependencias, fronteras entre capas y ciclos.

## Características (0.1.0)

- Análisis estático de TypeScript y JavaScript (`import` y `export ... from`)
- Imports relativos y aliases de `tsconfig` (`@/domain/order`)
- `import type` cuenta como dependencia
- Capas con globs
- `cannotDependOn` y `canOnlyDependOn` (no ambos en la misma regla)
- Detección de ciclos, un ciclo reportado por componente fuertemente conexo
- Excepciones con fecha de caducidad opcional
- `exclude`, `ignore` y excepciones por archivo
- Informe de terminal y JSON
- Códigos de salida para CI (`0` / `1` / `2`)
- Configuración YAML o JSON
- Monorepos básicos por glob
- API programática (`analyzeArchitecture`)
- Análisis local: el código se parsea, no se ejecuta

## Instalación

```bash
npm install --save-dev @erickmorales91/architecture-boundary-check
```

```bash
pnpm add -D @erickmorales91/architecture-boundary-check
```

Requiere Node.js 20 o superior. TypeScript es dependencia de runtime del analyzer; no hace falta configurar ESLint.

## Inicio rápido

Crea `architecture-boundary.yml` en la raíz del proyecto (nombre recomendado):

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

Ejecuta:

```bash
npx architecture-boundary-check
```

Sin subcomando, `architecture-boundary-check` es un alias de `check`.

Si el grafo es válido:

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

Si el dominio importa infraestructura:

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

Architecture check failed.
```

Código de salida: `1`. El pull request falla.

## CLI

```
Uso:
  architecture-boundary-check [check] [options]

Opciones:
  --config <path>   Ruta a architecture-boundary.yml
  --root <path>     Directorio del proyecto a analizar (por defecto: el actual)
  --format <type>   console (por defecto) | json
  --help            Ayuda
  --version         Versión

Códigos de salida:
  0  Éxito
  1  Violaciones de arquitectura (o ciclos prohibidos)
  2  Error de configuración o ejecución, incluida una ejecución que no analizó nada
```

Ejemplos:

```bash
npx architecture-boundary-check
npx architecture-boundary-check check
npx architecture-boundary-check check --config ./config/architecture.yaml
npx architecture-boundary-check --format json
npx architecture-boundary-check --root ./packages/api
```

### Una ejecución que no analiza nada falla

Si no se analiza ningún archivo, o si no se clasifica ninguno en una capa habiendo reglas
configuradas, el comando sale con **2**, no con 0. Las dos situaciones reportan cero violaciones
por la misma razón que un proyecto vacío, y ninguna dice nada sobre el proyecto: la primera nunca
lo escaneó, y la segunda nunca llegó a una regla, porque las reglas se resuelven por nombre de
capa. El mensaje nombra el `root`, las exclusiones o los globs de capa que lo explican.

Las causas habituales son un `root` mal escrito, un `exclude` que cubre todo el árbol de
fuentes, ejecutar el comando fuera de la raíz del proyecto (usar `--root`), o globs de capa que
no coinciden con la estructura real de carpetas.

El CLI busca, en este orden:

1. `architecture-boundary.yml` (recomendado)
2. `architecture-boundary.yaml`
3. `architecture-boundary.json`

## Configuración

`root` es el directorio a escanear. Los globs de capa se resuelven respecto a ese root.

Los globs se resuelven primero respecto a `root`, y solo se reintentan contra la ruta relativa al proyecto si ninguna capa coincide.

Un archivo pertenece a una sola capa. Si coincide con dos, es error de configuración (salida `2`). Si no coincide con ninguna queda **sin clasificar**; en 0.1.0 eso no es violación.

En cada regla usa **o** `cannotDependOn` **o** `canOnlyDependOn`, nunca ambos:

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

Los paquetes externos (`import { z } from 'zod'`) se ignoran. La herramienta mira arquitectura interna, no el grafo de npm.

### Ciclos

Los ciclos siempre aparecen en el informe. Solo fallan el check si lo activas:

```yaml
cycles:
  forbidden: true
```

Por defecto: `false`.

### Exclusiones y excepciones

```yaml
exclude:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "dist/**"

ignore:
  - source: "src/legacy/**"

exceptions:
  - from: domain
    to: infrastructure
    files:
      - "src/domain/legacy/**"
    reason: "Migración legacy"
    expires: "2026-12-31"
```

Si `expires` ya pasó, la carga de configuración falla con `Architecture exception expired`.

Esquema completo: [docs/configuration.md](docs/configuration.md). Reglas: [docs/rules.md](docs/rules.md).

## CI

```yaml
- name: Architecture boundaries
  run: npx architecture-boundary-check
```

JSON para integraciones:

```bash
architecture-boundary-check --format json
```

```json
{
  "passed": false,
  "files": 284,
  "dependencies": 931,
  "violations": [
    {
      "source": "src/domain/order.ts",
      "target": "src/infrastructure/order.repository.ts",
      "sourceLayer": "domain",
      "targetLayer": "infrastructure",
      "rule": "domain cannot depend on infrastructure",
      "line": 4,
      "column": 1
    }
  ],
  "cycles": [],
  "cyclesForbidden": false
}
```

## Monorepos

0.1.0 no lee grafos de Nx, Turborepo ni workspaces de pnpm. Los globs bastan para separar apps y packages. Ver [docs/monorepos.md](docs/monorepos.md) y `examples/monorepo`.

## Ejemplos

| Ejemplo | Qué demuestra |
| --- | --- |
| [examples/clean-architecture](examples/clean-architecture) | `presentation → application → domain`; infraestructura solo depende de dominio |
| [examples/modular-monolith](examples/modular-monolith) | los módulos de feature pueden usar `shared`; `shared` no depende de features |
| [examples/monorepo](examples/monorepo) | las apps pueden depender de packages; los packages no pueden depender de apps |

Desde el directorio del ejemplo:

```bash
npx architecture-boundary-check
```

## API programática

El núcleo devuelve datos. No imprime.

```ts
import { analyzeArchitecture } from '@erickmorales91/architecture-boundary-check';

const result = await analyzeArchitecture({
  rootDirectory: process.cwd(),
  config,
});
```

## Cómo funciona

```
Fuentes TypeScript / JavaScript
        ↓
TypeScript Compiler API  (parse + resolveModuleName)
        ↓
Grafo de dependencias    (archivo → archivo)
        ↓
Motor de arquitectura    (capas, reglas, ciclos)
        ↓
Violaciones / informe / código de salida
```

El motor no mira el AST. Un analyzer de PHP o Java futuro puede alimentar el mismo grafo.

Este repositorio usa la herramienta contra sí mismo: `core` no puede depender de `cli`, `analyzers` ni `config`. Ver [docs/architecture.md](docs/architecture.md).

## Seguridad

- Análisis local. Sin red, telemetría ni API remota.
- Los archivos se parsean. Nunca se cargan con `import()` o `require()` como módulos ejecutables.
- Los symlinks que salen de la raíz del proyecto se ignoran.

## Limitaciones (0.1.0)

Soportado:

- TypeScript y JavaScript
- `import` estático y `export ... from`
- Rutas relativas y aliases de `tsconfig`
- `import type` (cuenta como dependencia)
- Capas, `cannotDependOn`, `canOnlyDependOn`
- Ciclos
- Excepciones con caducidad opcional
- Salida de consola y JSON

No está en esta versión:

- `import()` dinámico
- `require()` de CommonJS
- Seguir cadenas de reexport más allá del archivo importado
- API pública vs internos de un módulo (`payments/index.ts` vs `payments/internal/**`)
- Baseline / “no new violations” para código legacy
- Anotaciones `::error` de GitHub Actions
- Listas allow/deny de paquetes npm (`domain` no puede importar `prisma`)
- `strictClassification` (todo archivo debe pertenecer a una capa)
- PHP, Java, C#, Python, Go
- Integración con grafos de Nx / Turborepo
- Caché persistente o workers

Detalle: [docs/limitations.md](docs/limitations.md).

## Tests

```bash
npm install
npm run check:full
```

`npm run check:full` es la compuerta que corren CI y `prepublishOnly`: lint, typecheck, cobertura, build, la herramienta revisando su propia arquitectura, y una verificación de paquete que importa el entry point compilado, ejecuta el CLI y confirma que todos los source maps resuelven dentro de los archivos publicados.

El repositorio se construye y se bloquea con npm. pnpm también funciona — `pnpm install` resuelve el mismo manifiesto — pero el lockfile versionado es `package-lock.json`.

## Roadmap

**0.2.0:** baseline (`architecture-boundary-check baseline`), anotaciones de GitHub Actions, fronteras public/internal de módulos, imports dinámicos, `require`, reglas de dependencias externas.

**0.3.0+:** analyzers de PHP, Java, C# y Python detrás del mismo contrato `DependencyAnalyzer`.

## Contribuir

Ver [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

MIT. Ver [LICENSE](LICENSE).
