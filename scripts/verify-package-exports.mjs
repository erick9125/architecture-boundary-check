import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
);
const packageName = manifest.name;

if (!fs.existsSync(path.join(packageRoot, 'dist'))) {
  console.error('No dist/ directory. Run `npm run build` first.');
  process.exit(1);
}

const workspace = fs.mkdtempSync(
  path.join(os.tmpdir(), 'architecture-boundary-check-consumer-'),
);
const linkPath = path.join(workspace, 'node_modules', ...packageName.split('/'));

// The surface `src/index.ts` promises. A build that silently drops one of these
// still passes the test suite, which imports from source rather than from dist.
const ESM_ENTRY = `
import {
  analyzeArchitecture,
  evaluateArchitecture,
  DependencyGraph,
  LayerResolver,
  detectCycles,
  evaluateRules,
  loadConfigFile,
  loadConfigFromDirectory,
  findConfigFile,
  validateConfig,
  configToModel,
  ConfigurationError,
  TypeScriptDependencyAnalyzer,
  VERSION,
  EXIT_SUCCESS,
  EXIT_VIOLATIONS,
  EXIT_ERROR,
} from ${JSON.stringify(packageName)};

const functions = {
  analyzeArchitecture,
  evaluateArchitecture,
  DependencyGraph,
  LayerResolver,
  detectCycles,
  evaluateRules,
  loadConfigFile,
  loadConfigFromDirectory,
  findConfigFile,
  validateConfig,
  configToModel,
  ConfigurationError,
  TypeScriptDependencyAnalyzer,
};

for (const [name, value] of Object.entries(functions)) {
  if (typeof value !== 'function') throw new Error('root missing ' + name);
}

if (VERSION !== ${JSON.stringify(manifest.version)}) {
  throw new Error('VERSION is ' + VERSION + ', package.json says ${manifest.version}');
}

if (EXIT_SUCCESS !== 0 || EXIT_VIOLATIONS !== 1 || EXIT_ERROR !== 2) {
  throw new Error('exit codes changed: ' + [EXIT_SUCCESS, EXIT_VIOLATIONS, EXIT_ERROR]);
}

console.log('  import root: OK');
`;

function run(label, dir, entry) {
  console.log(label);
  execFileSync(process.execPath, [entry], { cwd: dir, stdio: 'inherit' });
}

/**
 * The CLI is the primary way this package is used, and `bin` points into
 * `dist`. A build that emits nothing there, or drops the shebang, leaves an
 * installed package whose only entry point does not run.
 */
function verifyBin() {
  console.log('CLI:');
  const [binName, binPath] = Object.entries(manifest.bin)[0];
  const resolved = path.join(packageRoot, binPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`bin ${binName} points at ${binPath}, which was not built`);
  }

  const firstLine = fs.readFileSync(resolved, 'utf8').split('\n', 1)[0];
  if (!firstLine.startsWith('#!')) {
    throw new Error(`bin ${binName} lost its shebang: ${firstLine}`);
  }

  const printed = execFileSync(process.execPath, [resolved, '--version'], {
    encoding: 'utf8',
  }).trim();

  if (printed !== manifest.version) {
    throw new Error(`--version printed ${printed}, package.json says ${manifest.version}`);
  }

  console.log(`  ${binName} --version: OK`);
}

/**
 * The build emits source maps whose `sources` point outside `dist`. If `files`
 * stops shipping `src`, every map in the published package resolves to nothing
 * and no debugger can step into it — a defect invisible from inside the repo,
 * where the sources are always there.
 */
function verifySourceMaps() {
  console.log('Source maps:');
  const shipped = new Set(manifest.files);
  const maps = [];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.map')) maps.push(full);
    }
  };

  walk(path.join(packageRoot, 'dist'));

  for (const map of maps) {
    const { sources } = JSON.parse(fs.readFileSync(map, 'utf8'));
    for (const source of sources) {
      const target = path.resolve(path.dirname(map), source);
      const relative = path.relative(packageRoot, target).split(path.sep)[0];

      if (!fs.existsSync(target)) {
        throw new Error(`${path.relative(packageRoot, map)} points at a missing ${source}`);
      }

      if (!shipped.has(relative)) {
        throw new Error(
          `${path.relative(packageRoot, map)} points into ${relative}/, which package.json "files" does not publish`,
        );
      }
    }
  }

  console.log(`  ${maps.length} maps resolve inside the published files: OK`);
}

try {
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  fs.symlinkSync(packageRoot, linkPath, 'junction');

  const esmDir = path.join(workspace, 'esm');
  fs.mkdirSync(esmDir);
  fs.writeFileSync(
    path.join(esmDir, 'package.json'),
    '{"name":"consumer-esm","type":"module"}',
  );
  fs.writeFileSync(path.join(esmDir, 'index.mjs'), ESM_ENTRY);

  console.log('ESM:');
  run('', esmDir, 'index.mjs');
  verifyBin();
  verifySourceMaps();

  console.log('\nPackage exports, CLI and source maps verified.');
} finally {
  fs.rmSync(workspace, { recursive: true, force: true });
}
