export function toPosixPath(filePath: string): string {
  return filePath.replaceAll('\\', '/');
}

/**
 * Collapses `.` and `..` segments without letting a path escape quietly.
 *
 * A `..` that has nothing left to consume is kept rather than dropped: turning
 * `../../etc/passwd` into `etc/passwd` would forge a path that looks like it
 * sits inside the project and can match a layer glob. An absolute path still
 * discards them, which is what POSIX does at the root.
 */
export function normalizeRelativePath(filePath: string): string {
  const posix = toPosixPath(filePath);
  const isAbsolute = posix.startsWith('/');
  const parts: string[] = [];

  for (const part of posix.split('/')) {
    if (part === '' || part === '.') {
      continue;
    }

    if (part === '..') {
      const last = parts[parts.length - 1];
      if (last !== undefined && last !== '..') {
        parts.pop();
      } else if (!isAbsolute) {
        parts.push('..');
      }
      continue;
    }

    parts.push(part);
  }

  if (isAbsolute) {
    return `/${parts.join('/')}`;
  }

  return parts.join('/');
}
