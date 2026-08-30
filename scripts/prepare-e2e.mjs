import { rmSync } from 'node:fs';
rmSync('test-results/e2e.sqlite', { force: true });
rmSync('test-results/e2e.sqlite-shm', { force: true });
rmSync('test-results/e2e.sqlite-wal', { force: true });
