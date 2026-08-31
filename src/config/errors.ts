export class ConfigurationError extends Error {
  readonly exitCode = 2;

  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
