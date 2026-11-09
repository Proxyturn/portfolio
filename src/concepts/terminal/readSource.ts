/**
 * Test helper: reads a source file next to this one as text. Vitest replaces CSS imports
 * (even `?raw`) with empty strings, so the CSS is read from disk through Node instead. The
 * module name is a variable so the app's TypeScript config needs no Node types.
 */
export async function readSource(name: string): Promise<string> {
  const nodeFs = 'node:fs/promises';
  const fs = (await import(/* @vite-ignore */ nodeFs)) as {
    readFile(path: URL, encoding: 'utf8'): Promise<string>;
  };
  return fs.readFile(new URL(name, import.meta.url), 'utf8');
}
