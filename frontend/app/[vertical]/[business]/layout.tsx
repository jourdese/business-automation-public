import type { ReactNode } from 'react';

type Props = { children: ReactNode };

export default function PublicBusinessLayout({ children }: Props) {
  return children;
}
