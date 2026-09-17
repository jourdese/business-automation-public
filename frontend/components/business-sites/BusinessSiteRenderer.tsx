import type { ComponentType } from 'react';
import BusinessDemoPage from '@/components/jourvis/BusinessDemoPage';
import { resolveBusinessSite, type BusinessSiteId } from '@/lib/businesses/registry';
import type { BusinessSiteProps } from '@/lib/businesses/types';

const renderers: Record<BusinessSiteId, () => Promise<{ default: ComponentType<BusinessSiteProps> }>> = {
  'the-rib-crib': () => import('./restaurant/the-rib-crib/RibCribPage'),
  'the-wild-tree': () => import('./restaurant/the-wild-tree/WildTreePage'),
};

/** Server-side dispatch after database route resolution; generic demos remain the fallback. */
export default async function BusinessSiteRenderer({ business }: BusinessSiteProps) {
  const siteId = resolveBusinessSite(business.publicPath, business.adapterKey);
  if (!siteId) return <BusinessDemoPage key={business.publicPath} business={business} />;
  const { default: Site } = await renderers[siteId]();
  return <Site key={business.publicPath} business={business} />;
}
