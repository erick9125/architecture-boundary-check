# Security

Architecture Boundary Check performs local static analysis and sends no source code externally. There is no network client, telemetry, or remote API in the default tool.

## Reporting a vulnerability

Please report security issues privately through GitHub Security Advisories on this repository. Do not open a public issue for vulnerabilities.

## Operational guidance

- Source files are parsed with the TypeScript Compiler API. They are never loaded with `import()` or `require()` as executable modules.
- Symlinks are followed only when the real path stays inside the project root.
- Configuration and reports may include local file paths. Do not publish logs from private repositories if those paths are sensitive.
