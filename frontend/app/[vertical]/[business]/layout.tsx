import type { ReactNode } from 'react';
import RibCribAssetBridge from '@/components/jourvis/RibCribAssetBridge';

type RouteParams = { vertical: string; business: string };
type Props = { children: ReactNode; params: Promise<RouteParams> | RouteParams };

export default async function PublicBusinessLayout({ children, params }: Props) {
  const { vertical, business } = await params;
  const isRibCrib = vertical === 'restaurant' && business === 'the-rib-crib';

  return (
    <>
      {children}
      {isRibCrib ? <RibCribAssetBridge /> : null}
    </>
  );
}
