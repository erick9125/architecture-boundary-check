import path from 'node:path';
import type { ArchitectureConfig } from '../../config/config.js';
import type { ArchitectureAnalysisResult } from '../../core/results/analysis-result.js';

export interface PreflightContext {
  readonly rootDirectory: string;
}

/**
 * Catches the run that passed by having stopped looking.
 *
 * A check that analyzed nothing, or that classified nothing into a layer while
 * rules are configured, reports zero violations for the same reason an empty
 * project does — and in CI it keeps reporting zero for as long as the typo that
 * caused it survives. Neither state can be a passing run, so the CLI refuses to
 * grade it: the exit code says configuration error, not success.
 *
 * Lives beside `hasFailures` for the same reason. The result alone cannot
 * answer the question — `root`, `exclude` and the layer globs that explain the
 * emptiness are in the configuration — and the library keeps reporting facts
 * while the CLI decides what they mean.
 */
export function preflightFailure(
  result: ArchitectureAnalysisResult,
  config: ArchitectureConfig,
  context: PreflightContext,
): string | undefined {
  if (result.filesAnalyzed === 0) {
    return describeEmptyScan(config, context);
  }

  if (config.rules.length > 0 && result.filesClassified === 0) {
    return describeUnclassified(result, config);
  }

  return undefined;
}

function describeEmptyScan(
  config: ArchitectureConfig,
  context: PreflightContext,
): string {
  const root = config.root ?? '.';
  const lines = [
    'No source files were analyzed.',
    '',
    `Scan root:  ${path.resolve(context.rootDirectory, root)}`,
    `            (root: ${JSON.stringify(root)}, relative to ${context.rootDirectory})`,
  ];

  if (config.exclude !== undefined && config.exclude.length > 0) {
    lines.push(`Exclusions: ${config.exclude.join(', ')}`);
  }

  lines.push(
    '',
    'Nothing was scanned, so no rule could run and the result says nothing',
    'about this project. Check that `root` points at the source tree, that',
    '`exclude` does not cover all of it, and that the command runs from the',
    'project root (or pass --root).',
  );

  return lines.join('\n');
}

function describeUnclassified(
  result: ArchitectureAnalysisResult,
  config: ArchitectureConfig,
): string {
  const ruleCount = config.rules.length;
  const rules = ruleCount === 1 ? '1 rule' : `${ruleCount} rules`;
  const files =
    result.filesAnalyzed === 1
      ? '1 file was'
      : `${result.filesAnalyzed} files were`;

  return [
    `${files} analyzed and none of them matched a layer.`,
    '',
    'Layers:',
    ...config.layers.map(
      (layer) => `  ${layer.name}: ${layer.paths.join(', ')}`,
    ),
    '',
    `Rules are keyed on layer names, so none of the ${rules} configured here`,
    'could apply and the result says nothing about this project. Layer globs',
    'are matched against paths relative to `root`, and then against paths',
    'relative to the project root.',
  ].join('\n');
}
