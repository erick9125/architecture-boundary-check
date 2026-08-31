export class ArchitectureEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArchitectureEngineError';
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
