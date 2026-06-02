import { Injectable } from '@nestjs/common';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { basename, join, resolve } from 'path';

@Injectable()
export class DatabaseBackupService {
  async snapshot(reason = 'order-change') {
    try {
      if (process.env.DB_TYPE !== 'sqljs') return { ok: true, skipped: true };

      await wait(80);
      const dbPath = resolve(process.cwd(), process.env.SQLJS_DB_PATH || 'local-test.sqlite');
      if (!existsSync(dbPath)) return { ok: false, skipped: true };

      const backupDir = resolve(process.cwd(), process.env.DB_BACKUP_DIR || 'backups/order-data');
      mkdirSync(backupDir, { recursive: true });

      const backupPath = join(backupDir, `${timestamp()}-${safeName(reason)}-${basename(dbPath)}`);
      copyFileSync(dbPath, backupPath);
      this.cleanup(backupDir);
      return { ok: true, backupPath };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'backup failed' };
    }
  }

  private cleanup(backupDir: string) {
    const keep = Math.max(1, Number(process.env.DB_BACKUP_KEEP || 30));
    const backups = readdirSync(backupDir)
      .filter((name) => name.endsWith('.sqlite'))
      .map((name) => ({ name, path: join(backupDir, name), mtime: statSync(join(backupDir, name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);

    backups.slice(keep).forEach((file) => unlinkSync(file.path));
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${String(now.getMilliseconds()).padStart(3, '0')}`;
}

function safeName(value: string) {
  return String(value || 'snapshot')
    .replace(/[^a-z0-9_-]/gi, '-')
    .slice(0, 40);
}
