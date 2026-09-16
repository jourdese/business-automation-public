import type { SVGProps } from 'react';
export type IconName = 'arrow' | 'diagonal' | 'down' | 'plus' | 'minus' | 'close' | 'search' | 'bag' | 'calendar' | 'chat' | 'menu' | 'check' | 'star' | 'people';
const paths: Record<IconName, string> = {
  arrow: 'M4 12h15m-6-6 6 6-6 6', diagonal: 'M6 18 18 6M6 6h12v12', down: 'm6 9 6 6 6-6',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', close: 'm6 6 12 12M6 18 18 6',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  bag: 'M4 7h16l1 14H3L4 7ZM8 8V6a4 4 0 0 1 8 0v2',
  calendar: 'M3 5h18v16H3V5ZM7 2v6m10-6v6M3 11h18m-13 5h2m4 0h2',
  chat: 'M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-1L3 21l1-5a9 9 0 1 1 17-5Z',
  menu: 'M4 6h16M4 12h16M4 18h16', check: 'm5 12 4 4L19 6',
  star: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z',
  people: 'M8 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM2 21v-5a6 6 0 0 1 12 0v5m2-18a3 3 0 0 1 0 6m1 3a5 5 0 0 1 5 5v4',
};
export default function Icon({ name, size = 20, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
