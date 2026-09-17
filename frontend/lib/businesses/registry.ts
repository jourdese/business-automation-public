/** Presentation selection only: this registry must never create or authorize a public route. */
export type BusinessSiteId = 'the-rib-crib' | 'the-wild-tree' | 'marinara-ristorante';
const sites: ReadonlyMap<string, { id: BusinessSiteId; adapterKey: string }> = new Map([
  ['/restaurant/the-rib-crib', { id: 'the-rib-crib', adapterKey: 'restaurant' }],
  ['/restaurant/the-wild-tree', { id: 'the-wild-tree', adapterKey: 'restaurant' }],
  ['/restaurant/marinara-ristorante', { id: 'marinara-ristorante', adapterKey: 'restaurant' }],
]);
export function resolveBusinessSite(publicPath: string, adapterKey: string): BusinessSiteId | null {
  const site = sites.get(publicPath);
  return site?.adapterKey === adapterKey ? site.id : null;
}
