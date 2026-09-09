import test from 'node:test';
import assert from 'node:assert/strict';
import { demoReducer, initialDemo } from '../lib/jourvis/scenarios.ts';
import { companionTransition } from '../lib/jourvis/config.ts';

await test('late scenario completion cannot cross a preset reset', () => {
  const started = demoReducer(initialDemo, {
    type: 'START',
    task: 'appointment',
  });
  const switched = demoReducer(started, { type: 'PRESET', preset: 'dental' });
  assert.deepEqual(
    demoReducer(switched, { type: 'FINISH', run: started.run }),
    switched,
  );
  assert.equal(switched.slot, null);
  assert.equal(switched.phase, 'ready');
});
await test('only an offered slot in a completed appointment example can be selected', () => {
  assert.equal(
    demoReducer(initialDemo, { type: 'SLOT', slot: '11:00 AM' }),
    initialDemo,
  );
  const started = demoReducer(initialDemo, {
    type: 'START',
    task: 'appointment',
  });
  const ready = demoReducer(started, { type: 'FINISH', run: started.run });
  assert.equal(demoReducer(ready, { type: 'SLOT', slot: '4:00 AM' }), ready);
  const selected = demoReducer(ready, { type: 'SLOT', slot: '11:00 AM' });
  assert.equal(
    demoReducer(selected, { type: 'SLOT', slot: '2:30 PM' }).slot,
    '2:30 PM',
  );
});
await test('replay and reset cannot retain an appointment preview', () => {
  const started = demoReducer(initialDemo, {
    type: 'START',
    task: 'appointment',
  });
  const selected = demoReducer(
    demoReducer(started, { type: 'FINISH', run: started.run }),
    { type: 'SLOT', slot: '11:00 AM' },
  );
  assert.equal(
    demoReducer(selected, { type: 'START', task: 'appointment' }).slot,
    null,
  );
  const reset = demoReducer(selected, { type: 'RESET' });
  assert.equal(reset.phase, 'ready');
  assert.equal(reset.slot, null);
});
await test('pointer curiosity cannot interrupt organizing or human handoff', () => {
  assert.equal(companionTransition('idle', 'NOTICE'), 'curious');
  assert.equal(companionTransition('curious', 'REST'), 'idle');
  assert.equal(companionTransition('organizing', 'NOTICE'), 'organizing');
  assert.equal(companionTransition('handoff', 'REST'), 'handoff');
  assert.equal(companionTransition('completed', 'LISTEN'), 'listening');
  assert.equal(companionTransition('listening', 'ORGANIZE'), 'organizing');
  assert.equal(companionTransition('organizing', 'COMPLETE'), 'completed');
  assert.equal(companionTransition('organizing', 'HANDOFF'), 'handoff');
  assert.equal(companionTransition('handoff', 'RESET'), 'idle');
});
