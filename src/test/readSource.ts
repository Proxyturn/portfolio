/**
 * Test helper: reads a source file as text. Vitest replaces CSS imports (even `?raw`) with
 * empty strings, so CSS is read from disk through Node instead. Call it as
 * `readSource('./file.css', import.meta.url)` (a literal `new URL(…, import.meta.url)` would be
 * rewritten by Vite as an asset). The module name is a variable so the app's TypeScript config
 * needs no Node types.
 */
export async function readSource(path: string, base: string): Promise<string> {
  const nodeFs = 'node:fs/promises';
  const fs = (await import(/* @vite-ignore */ nodeFs)) as {
    readFile(path: URL, encoding: 'utf8'): Promise<string>;
  };
  return fs.readFile(new URL(path, base), 'utf8');
}
