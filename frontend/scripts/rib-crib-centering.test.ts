import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../components/jourvis/RibCribJourvisChat.module.css', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const panel = css.match(/\.panel:global\(\.rib-jourvis-chat\)\s*\{([\s\S]*?)\n\}/)?.[1];
const row = css.match(/\.panel:global\(\.rib-jourvis-chat\) :global\(\.rib-chat-message\)\s*\{([\s\S]*?)\n\}/)?.[1];
const bubble = css.match(/\.panel:global\(\.rib-jourvis-chat\) :global\(\.rib-chat-message\) > p\s*\{([\s\S]*?)\n\}/)?.[1];

// The filename is retained for the existing test:frontend entry point.
// Center the mascot only. The chat window belongs in the bottom-right corner.
test('docked chat disables the legacy animation and all centering transforms', () => {
  assert.ok(panel);
  assert.match(panel, /(?:^|;)\s*animation\s*:\s*none\s*;/);
  assert.match(panel, /(?:^|;)\s*transform\s*:\s*none\s*;/);
});

test('chat is anchored to safe bottom/right edges and constrained to the viewport', () => {
  assert.ok(panel);
  assert.match(panel, /position\s*:\s*fixed\s*;/);
  assert.match(panel, /top\s*:\s*auto\s*;/);
  assert.match(panel, /left\s*:\s*auto\s*;/);
  assert.match(panel, /right\s*:\s*var\(--rib-chat-gap\)\s*;/);
  assert.match(panel, /bottom\s*:\s*var\(--rib-chat-gap\)\s*;/);
  assert.match(panel, /width\s*:\s*min\(410px,\s*calc\(100vw/);
  assert.match(panel, /max-height\s*:\s*calc\(100dvh\s*-\s*var\(--rib-chat-gap\)\s*-\s*var\(--rib-chat-gap\)\)/);
});

test('full-width nonshrinking message rows cannot compound percentage bubble limits', () => {
  assert.ok(row);
  assert.match(row, /(?:^|;)\s*width\s*:\s*100%\s*;/);
  assert.match(row, /max-width\s*:\s*none\s*;/);
  assert.match(row, /align-self\s*:\s*stretch\s*;/);
  assert.match(row, /flex\s*:\s*0 0 auto\s*;/);
  assert.match(row, /margin\s*:\s*0\s*;/);
  assert.match(css, /:global\(\.rib-chat-message\.customer\)\s*\{\s*justify-content:\s*flex-end;/);
});

test('bubbles fit short text and wrap long content within a definite row', () => {
  assert.ok(bubble);
  assert.match(bubble, /width\s*:\s*fit-content\s*;/);
  assert.match(bubble, /max-width\s*:\s*88%\s*;/);
  assert.match(bubble, /white-space\s*:\s*pre-wrap\s*;/);
  assert.match(bubble, /word-break\s*:\s*normal\s*;/);
  assert.match(bubble, /overflow-wrap\s*:\s*anywhere\s*;/);
  assert.match(bubble, /font-size\s*:\s*14px\s*;/);
});

test('chat keeps a centered mascot and independent scrollable message area', () => {
  const mascot = css.match(/:global\(\.rib-jourvis-mini\)\s*\{([\s\S]*?)\n\}/)?.[1];
  const log = css.match(/:global\(\.rib-jourvis-log\)\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(mascot);
  assert.match(mascot, /place-items\s*:\s*center\s*;/);
  assert.ok(log);
  assert.match(log, /min-height\s*:\s*0\s*;/);
  assert.match(log, /overflow-y\s*:\s*auto\s*;/);
  assert.match(log, /gap\s*:\s*12px\s*;/);
});
