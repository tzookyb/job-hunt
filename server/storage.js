// The JSON "database": one file, written atomically, with the previous version kept as a safety net.
import fs from 'node:fs/promises';

export class JsonStore {
  constructor({ file, previousFile }) {
    this.file = file;
    this.previousFile = previousFile;
  }

  // Returns the raw JSON text, or '{}' when nothing has been saved yet.
  async read() {
    try { return await fs.readFile(this.file, 'utf8'); }
    catch (e) { if (e.code === 'ENOENT') return '{}'; throw e; }
  }

  // Validates, keeps the current file as the previous version, then writes via temp file + rename.
  async write(text) {
    JSON.parse(text);   // throws on invalid JSON — nothing is touched
    try { await fs.copyFile(this.file, this.previousFile); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    const tmp = this.file + '.tmp';
    await fs.writeFile(tmp, text);
    await fs.rename(tmp, this.file);
  }
}
