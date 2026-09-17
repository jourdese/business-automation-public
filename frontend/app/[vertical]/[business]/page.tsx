import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BusinessSiteRenderer from '@/components/business-sites/BusinessSiteRenderer';
import {
  listPublicBusinessRoutes,
  resolvePublicBusinessRoute,
} from '@/lib/jourvis/public-business-routes';

type RouteParams = { vertical: string; business: string };
type RoutePageProps = { params: Promise<RouteParams> | RouteParams };

export const dynamicParams = false;

export async function generateStaticParams() {
  const routes = await listPublicBusinessRoutes();
  return routes.map((route) => ({
    vertical: route.vertical_slug,
    business: route.business_slug,
  }));
}

export async function generateMetadata({ params }: RoutePageProps): Promise<Metadata> {
  const { vertical, business } = await params;
  const route = await resolvePublicBusinessRoute(vertical, business);
  if (!route) return { title: 'Business not found', robots: { index: false, follow: false } };

  const ribCrib = route.public_path === '/restaurant/the-rib-crib';
  // Keep the fitted social card, but version its URL so preview services re-fetch
  // instead of reusing the earlier cached/cropped Rib Crib preview.
  const thumbnail = 'https://jourvis.ai/rib-crib/rib-crib-thumbnail.png';
  const title = `${route.display_name} | Jourvis`;
  const description = `Try the Jourvis business assistant with ${route.display_name}.`;

  return {
    title: route.display_name,
    description: `Talk with Jourvis as a customer of ${route.display_name}. This demo uses the ${route.adapter_key.replaceAll('_', ' ')} business adapter and database-backed sample business details.`,
    alternates: { canonical: route.public_path },
    openGraph: {
      title,
      description,
      url: route.public_path,
      ...(ribCrib ? {
        type: 'website' as const,
        images: [{ url: thumbnail, width: 1200, height: 630, type: 'image/png', alt: 'The Rib Crib — Let’s Meat Here. Eat Meat Repeat.' }],
      } : {}),
    },
    ...(ribCrib ? {
      twitter: {
        card: 'summary_large_image' as const,
        title,
        description,
        images: [{ url: thumbnail, alt: 'The Rib Crib — Eat Meat Repeat' }],
      },
    } : {}),
  };
}

export default async function BusinessRoutePage({ params }: RoutePageProps) {
  const { vertical, business } = await params;
  const route = await resolvePublicBusinessRoute(vertical, business);
  if (!route) notFound();

  return (
    <BusinessSiteRenderer
      business={{
        displayName: route.display_name,
        publicPath: route.public_path,
        adapterKey: route.adapter_key,
        presetKey: route.preset_key,
      }}
    />
  );
}
