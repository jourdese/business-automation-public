import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import WildTreePage from '@/components/business-sites/restaurant/the-wild-tree/WildTreePage';
import { wildTreePreviewBusiness } from '@/lib/businesses/restaurant/the-wild-tree/config';

export const metadata: Metadata = {
  title: 'The Wild Tree — local design preview',
  description: 'Local-only restaurant design review. Fictional menu prices; no real bookings or orders.',
  robots: { index: false, follow: false },
};

/** Development only. Never substitutes a hardcoded entry in the public route resolver. */
export default function WildTreePreview() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <WildTreePage business={wildTreePreviewBusiness} />;
}
