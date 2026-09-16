import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../components/jourvis/RibCribJourvisChat.module.css', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const panel = css.match(/\.panel:global\(\.rib-jourvis-chat\)\s*\{([\s\S]*?)\n\}/)?.[1];

// A higher-specificity transform alone is not enough. The global ribChatIn
// keyframes finish with transform:none and remain active via fill-mode:both.
test('centered chat explicitly disables the legacy transform animation', () => {
  assert.ok(panel, 'The scoped panel positioning rule must exist');
  assert.match(panel, /(?:^|;)\s*animation\s*:\s*none\s*;/);
});

test('centering moves the panel center, not its top-left corner, to the viewport center', () => {
  assert.ok(panel);
  assert.match(panel, /(?:^|;)\s*position\s*:\s*fixed\s*;/);
  assert.match(panel, /(?:^|;)\s*top\s*:\s*50%\s*;/);
  assert.match(panel, /(?:^|;)\s*left\s*:\s*50%\s*;/);
  assert.match(panel, /(?:^|;)\s*right\s*:\s*auto\s*;/);
  assert.match(panel, /(?:^|;)\s*bottom\s*:\s*auto\s*;/);
  assert.match(panel, /(?:^|;)\s*transform\s*:\s*translate\(-50%,\s*-50%\)\s*;/);
  assert.match(panel, /max-height\s*:\s*calc\(100dvh\s*-\s*var\(--rib-chat-gap\)\s*-\s*var\(--rib-chat-gap\)\)/);
});
