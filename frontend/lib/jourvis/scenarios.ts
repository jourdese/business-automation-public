export type Preset = 'general' | 'dental';
export type Task = 'question' | 'appointment' | 'handoff';
export const tasks: { id: Task; label: string; short: string }[] = [
  { id: 'question', label: 'Answer a customer question', short: 'A question' },
  { id: 'appointment', label: 'Find an appointment', short: 'An appointment' },
  { id: 'handoff', label: 'Bring in a person', short: 'A person' },
];
export const sampleSlots = ['9:30 AM', '11:00 AM', '2:30 PM'];
export const scenarios = {
  general: {
    label: 'General business',
    name: 'Fieldwork Studio',
    kind: 'A fictional creative business',
    hours: 'Monday–Friday, 9 AM–5 PM',
    service: 'Discovery consultation',
    duration: '30 minutes',
    question: 'Do you offer an initial consultation?',
    answer:
      'Yes. Fieldwork Studio offers a complimentary 30-minute discovery consultation. You can tell us about your project and explore the next steps.',
    factLabel: 'Initial consultation',
    fact: 'Complimentary · 30 minutes',
    appointmentPrompt: 'Could I find a time for a discovery consultation?',
    appointmentAnswer:
      'Of course. Here are three sample times for a 30-minute consultation. Which works for you?',
    handoffPrompt:
      'I have a project with a few special requirements. Could I talk to someone?',
    handoffAnswer:
      'Of course. I can bring the details together so you don’t have to start from the beginning.',
    handoffReason: 'Custom project requirements',
    context:
      'Alex is exploring a brand project and would like to discuss scope with the studio.',
  },
  dental: {
    label: 'Dental clinic',
    name: 'Cedar Dental',
    kind: 'A fictional dental clinic',
    hours: 'Monday–Saturday, 9 AM–5 PM',
    service: 'Dental consultation',
    duration: '30 minutes',
    question: 'How much is a dental consultation?',
    answer:
      'A dental consultation at Cedar Dental is PHP 800 and takes about 30 minutes. The dentist can explain any recommended treatment and its cost during your visit.',
    factLabel: 'Dental consultation',
    fact: 'PHP 800 · 30 minutes',
    appointmentPrompt: 'Could I find a time for a dental consultation?',
    appointmentAnswer:
      'Of course. Here are three sample times for a 30-minute consultation. Which works for you?',
    handoffPrompt:
      'I have a question about an existing treatment. Could I speak with the clinic?',
    handoffAnswer:
      'Of course. A member of the clinic team is the right person for that. Here is a summary they could pick up from.',
    handoffReason: 'Question about an existing treatment',
    context:
      'Alex would like the clinic team to follow up about an existing treatment.',
  },
} as const;

export type DemoState = {
  preset: Preset;
  task: Task;
  phase: 'ready' | 'organizing' | 'result';
  slot: string | null;
  run: number;
};
export type DemoAction =
  | { type: 'PRESET'; preset: Preset }
  | { type: 'START'; task: Task }
  | { type: 'FINISH'; run: number }
  | { type: 'SLOT'; slot: string }
  | { type: 'RESET' };
export const initialDemo: DemoState = {
  preset: 'general',
  task: 'question',
  phase: 'ready',
  slot: null,
  run: 0,
};
export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'PRESET':
      return { ...initialDemo, preset: action.preset, run: state.run + 1 };
    case 'START':
      return {
        ...state,
        task: action.task,
        phase: 'organizing',
        slot: null,
        run: state.run + 1,
      };
    case 'FINISH':
      return action.run === state.run && state.phase === 'organizing'
        ? { ...state, phase: 'result' }
        : state;
    case 'SLOT':
      return state.task === 'appointment' &&
        state.phase === 'result' &&
        sampleSlots.includes(action.slot)
        ? { ...state, slot: action.slot }
        : state;
    case 'RESET':
      return { ...initialDemo, preset: state.preset, run: state.run + 1 };
  }
}
