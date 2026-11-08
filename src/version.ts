import { readFileSync } from 'fs';

function readPackageVersion(): string {
  try {
    // dist/version.js -> ../package.json (package root), same for src/ under tsx
    const pkgUrl = new URL('../package.json', import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgUrl, 'utf8')) as { version?: string };
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

export const SERVER_VERSION = readPackageVersion();
