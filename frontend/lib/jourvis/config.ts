export const siteConfig = {
  name: 'Jourvis',
  description:
    'Your AI business assistant for customer questions, appointment coordination, and everyday work.',
  contactEmail: 'jourdesepalacio@gmail.com',
  // Supplied and connected Jourvis Page; separate from the local interactive preview.
  messengerUrl: 'https://www.facebook.com/profile.php?id=61594256550754',
};

export const palette = {
  ink: '#08141F',
  navy: '#1F3A5F',
  emerald: '#2E6B57',
  mint: '#A7E3C5',
  gold: '#C8A96B',
  ivory: '#F7F4EE',
  slate: '#AAB8C2',
} as const;

export const motion = {
  desktopParticles: 560,
  mobileParticles: 200,
  maxPixelRatio: 1.5,
  spring: 0.032,
  damping: 0.86,
  pointerRadius: 125,
  previewDelayMs: 650,
} as const;

export type CompanionState =
  | 'idle'
  | 'curious'
  | 'listening'
  | 'organizing'
  | 'completed'
  | 'handoff';
export type CompanionEvent =
  | 'NOTICE'
  | 'REST'
  | 'LISTEN'
  | 'ORGANIZE'
  | 'COMPLETE'
  | 'HANDOFF'
  | 'RESET';
export function companionTransition(
  state: CompanionState,
  event: CompanionEvent,
): CompanionState {
  switch (event) {
    case 'NOTICE':
      return state === 'idle' ? 'curious' : state;
    case 'REST':
      return state === 'curious' ? 'idle' : state;
    case 'LISTEN':
      return 'listening';
    case 'ORGANIZE':
      return 'organizing';
    case 'COMPLETE':
      return 'completed';
    case 'HANDOFF':
      return 'handoff';
    case 'RESET':
      return 'idle';
  }
}
export const companionCaptions: Record<CompanionState, string> = {
  idle: 'A little presence. A little more possibility.',
  curious: 'Right here, when you need me.',
  listening: 'Let’s start with one thing.',
  organizing: 'Let me organize that.',
  completed: 'One less thing on your list.',
  handoff: 'A person can take it from here.',
};

// A simple stepped companion silhouette, distinct from the text wordmark.
// Values: 0 empty, 1 body, 2 bright edge, 3 eye.
export const botPixels = [
  '00002222220000',
  '00221111112200',
  '02111111111120',
  '21111111111112',
  '21133111331112',
  '21133111331112',
  '21111111111112',
  '02111111111120',
  '00211111111200',
  '00021111112000',
  '00002111120000',
  '00221111200000',
  '00211112000000',
  '00022220000000',
];
