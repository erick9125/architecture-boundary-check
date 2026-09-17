export class ArchitectureEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArchitectureEngineError';
  }
}

/**
 * A language analyzer could not set itself up. Distinct from a bad
 * architecture config: the rules were fine, the toolchain underneath was not.
 */
export class AnalyzerError extends ArchitectureEngineError {
  constructor(message: string) {
    super(message);
    this.name = 'AnalyzerError';
  }
}

export class MultipleLayerMatchError extends ArchitectureEngineError {
  readonly file: string;
  readonly layers: readonly string[];

  constructor(file: string, layers: readonly string[]) {
    super(
      `Configuration error:\nfile matches multiple layers.\n\nFile: ${file}\nLayers: ${layers.join(', ')}`,
    );
    this.name = 'MultipleLayerMatchError';
    this.file = file;
    this.layers = layers;
  }
}
