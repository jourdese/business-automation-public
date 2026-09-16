/** Presentation selection only: this registry must never create or authorize a public route. */
const sites = new Map([
  ['/restaurant/the-rib-crib', { id: 'the-rib-crib', adapterKey: 'restaurant' }],
] as const);

export type BusinessSiteId = 'the-rib-crib';

export function resolveBusinessSite(publicPath: string, adapterKey: string): BusinessSiteId | null {
  const site = (sites as ReadonlyMap<string, { id: BusinessSiteId; adapterKey: string }>).get(publicPath);
  return site?.adapterKey === adapterKey ? site.id : null;
}
