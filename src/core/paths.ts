export function toPosixPath(filePath: string): string {
  return filePath.replaceAll('\\', '/');
}

export function normalizeRelativePath(filePath: string): string {
  const posix = toPosixPath(filePath);
  const parts: string[] = [];

  for (const part of posix.split('/')) {
    if (part === '' || part === '.') {
      continue;
    }
    if (part === '..') {
      parts.pop();
      continue;
    }
    parts.push(part);
  }

  if (posix.startsWith('/')) {
    return `/${parts.join('/')}`;
  }

  return parts.join('/');
}
