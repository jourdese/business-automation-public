import { marinaraDemoPreset, marinaraSeedSql } from '../lib/businesses/restaurant/marinara-ristorante/demo-preset.ts';
const mode = process.argv[2];
if (process.argv.length !== 3 || !['--json', '--sql'].includes(mode)) {
  console.error('Usage: node --experimental-strip-types scripts/export-marinara-menu.ts --json|--sql');
  process.exitCode = 1;
} else process.stdout.write(mode === '--sql' ? marinaraSeedSql() : JSON.stringify(marinaraDemoPreset, null, 2) + '\n');
