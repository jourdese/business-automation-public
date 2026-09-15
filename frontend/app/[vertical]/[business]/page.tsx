import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JourvisExperience from '@/components/jourvis/JourvisExperience';
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

  return {
    title: route.display_name,
    description: `Talk with Jourvis as a customer of ${route.display_name}. This demo uses the ${route.adapter_key.replaceAll('_', ' ')} business adapter and database-backed sample business details.`,
    alternates: { canonical: route.public_path },
    openGraph: {
      title: `${route.display_name} | Jourvis`,
      description: `Try the Jourvis business assistant with ${route.display_name}.`,
      url: route.public_path,
    },
  };
}

export default async function BusinessRoutePage({ params }: RoutePageProps) {
  const { vertical, business } = await params;
  const route = await resolvePublicBusinessRoute(vertical, business);
  if (!route) notFound();

  return (
    <JourvisExperience
      initialBusiness={{
        displayName: route.display_name,
        publicPath: route.public_path,
        adapterKey: route.adapter_key,
        presetKey: route.preset_key,
      }}
    />
  );
}
