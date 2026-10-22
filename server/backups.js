// Activity-driven automatic backups. There's no timer: every time the app talks to the server (opening it, saving)
// we check, at most once a minute. If the newest automatic backup is 6+ hours old, the data file is copied to
// backups/auto-<date>.json. Automatic backups older than 7 days are removed. Other files in the folder are never
// touched. So nothing happens while you're not using the app, and the first interaction after a break backs up.
import fs from 'node:fs/promises';
import path from 'node:path';

const HOUR = 3600e3;
const pad = n => String(n).padStart(2, '0');
const stamp = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
const AUTO = /^auto-(\d{4})-(\d\d)-(\d\d)_(\d\d)-(\d\d)-(\d\d)\.json$/;

// The time an automatic backup was made, read from its file name (null for other files).
export function backupTime(file) {
  const m = file.match(AUTO);
  return m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() : null;
}

export class Backups {
  constructor({ dataFile, dir, every = 6 * HOUR, keep = 7 * 24 * HOUR, throttle = 60e3, now = () => Date.now(), log = console.log }) {
    Object.assign(this, { dataFile, dir, every, keep, throttle, now, log });
    this.lastCheck = 0;
  }

  // Returns the new backup's file name, or null. `force` = "Back up now": always copy, never throttled.
  async check({ force = false } = {}) {
    const now = this.now();
    if (!force && now - this.lastCheck < this.throttle) return null;
    this.lastCheck = now;
    try { await fs.access(this.dataFile); } catch { if (force) throw Object.assign(new Error('Nothing to back up yet'), { status: 409 }); return null; }
    await fs.mkdir(this.dir, { recursive: true });
    const autos = (await fs.readdir(this.dir)).map(f => ({ f, t: backupTime(f) })).filter(x => x.t);
    const newest = Math.max(0, ...autos.map(x => x.t));
    let made = null;
    if (force || now - newest >= this.every) made = await this.copy(now);
    for (const x of autos) {
      if (now - x.t > this.keep) { await fs.unlink(path.join(this.dir, x.f)); this.log(`Removed old backup ${x.f}`); }
    }
    return made;
  }

  async copy(now) {
    const name = `auto-${stamp(new Date(now))}.json`;
    const tmp = path.join(this.dir, name + '.tmp');
    await fs.copyFile(this.dataFile, tmp);
    await fs.rename(tmp, path.join(this.dir, name));
    this.log(`Backup → ${name}`);
    return name;
  }
}
