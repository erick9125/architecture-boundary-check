import type { ArchitectureConfig } from '../../config/config.js';
import type { ArchitectureAnalysisResult } from '../../core/results/analysis-result.js';
import type { ArchitectureViolation } from '../../core/results/violation.js';
import type { DependencyCycle } from '../../core/graph/dependency-cycle.js';
import { hasFailures } from './verdict.js';

export function formatConsoleReport(
  result: ArchitectureAnalysisResult,
  config: ArchitectureConfig,
): string {
  const lines = [
    'Architecture Boundary Check',
    '',
    padLabel('Files analyzed', result.filesAnalyzed),
    // Next to the file count on purpose. `Layers` below counts what the
    // configuration declares, not what the run found, so without this line
    // there is no number that separates a check doing its job from one whose
    // globs quietly claim nothing.
    padLabel('Files classified', result.filesClassified),
    padLabel('Dependencies', result.dependenciesAnalyzed),
    padLabel('Layers', config.layers.length),
    padLabel('Rules', config.rules.length),
    padLabel('Cycles', result.cycles.length),
    '',
    padLabel('Violations', result.violations.length),
  ];

  if (result.violations.length > 0) {
    lines.push('');
    for (const violation of result.violations) {
      lines.push(formatViolation(violation));
    }
  }

  if (result.cycles.length > 0) {
    lines.push('');
    for (const cycle of result.cycles) {
      lines.push(formatCycle(cycle));
    }
  }

  lines.push('');
  if (hasFailures(result, config)) {
    lines.push('Architecture check failed.');
  } else {
    lines.push('Architecture check passed.');
  }

  return `${lines.join('\n')}\n`;
}

function formatViolation(violation: ArchitectureViolation): string {
  const location = formatLocation(violation);
  return [
    `[${violation.sourceLayer} → ${violation.targetLayer}]`,
    '',
    location,
    '  imports',
    violation.targetFile,
    '',
    'Rule:',
    violation.rule,
    '',
  ].join('\n');
}

function formatLocation(violation: ArchitectureViolation): string {
  if (violation.line !== undefined && violation.column !== undefined) {
    return `${violation.sourceFile}:${violation.line}:${violation.column}`;
  }

  if (violation.line !== undefined) {
    return `${violation.sourceFile}:${violation.line}`;
  }

  return violation.sourceFile;
}

function formatCycle(cycle: DependencyCycle): string {
  const first = cycle.files[0];
  if (first === undefined) {
    return 'Circular dependency detected.';
  }

  const steps = cycle.files.map((file, index) =>
    index === 0 ? file : `→ ${file}`,
  );
  steps.push(`→ ${first}`);

  return ['Circular dependency detected:', '', ...steps, ''].join('\n');
}

function padLabel(label: string, value: number): string {
  return `${label}:${' '.repeat(Math.max(1, 22 - label.length))}${String(value).padStart(5)}`;
}
