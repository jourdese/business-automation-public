import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MarinaraPage from '@/components/business-sites/restaurant/marinara-ristorante/MarinaraPage';
import { marinaraPreviewBusiness } from '@/lib/businesses/restaurant/marinara-ristorante/config';

export const metadata: Metadata = {
  title: 'Marinara Ristorante — local design preview',
  description: 'Local restaurant design review using archived menu references and demo-only planning data.',
  robots: { index: false, follow: false },
};

export default function MarinaraPreview() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <MarinaraPage business={marinaraPreviewBusiness} />;
}
