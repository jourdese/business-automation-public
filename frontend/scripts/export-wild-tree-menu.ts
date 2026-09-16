// Offline export only. This script has no database credentials or network/write operation.
import { wildTreeDemoPreset, wildTreeSeedSql } from '../lib/businesses/restaurant/the-wild-tree/demo-preset.ts';
const format = process.argv[2] ?? '--json';
if (format !== '--json' && format !== '--sql') {
  throw new Error('Usage: node --experimental-strip-types scripts/export-wild-tree-menu.ts [--json|--sql]');
}
process.stdout.write(format === '--sql' ? wildTreeSeedSql() : `${JSON.stringify(wildTreeDemoPreset, null, 2)}\n`);
