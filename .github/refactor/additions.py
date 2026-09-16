"""Complete the reviewed site packages. No database writes or deployment."""
from pathlib import Path
import os,json
assert os.environ.get('GITHUB_REF') == 'refs/heads/restaurant/the-rib-crib-v2'
r=Path.cwd(); f=r/'frontend'
def put(p,t):
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(t)
put(f/'lib/businesses/restaurant/shared/chat-config.ts','''export type RestaurantChatPresentation = {
  openEvent: string;
  stateEvent: string;
  panelId: string;
  messageId: string;
  disclaimerId: string;
  quickPrompts: readonly string[];
  placeholder: string;
  hint: string;
};

/** Use a different event/DOM namespace per routed business. Legacy clients may override it. */
export function createRestaurantChatPresentation(publicPath: string): RestaurantChatPresentation {
  if (!/^\\/[a-z0-9-]+\\/[a-z0-9-]+$/.test(publicPath)) {
    throw new Error('A canonical business path is required for restaurant chat.');
  }
  const scope = encodeURIComponent(publicPath);
  const prefix = `restaurant-${scope}`;
  return {
    openEvent: `jourvis:restaurant:${scope}:open`,
    stateEvent: `jourvis:restaurant:${scope}:state`,
    panelId: `${prefix}-panel`,
    messageId: `${prefix}-message`,
    disclaimerId: `${prefix}-disclaimer`,
    quickPrompts: ['Help me choose a meal.', 'Review my meal plan.', 'I’d like to ask about a table.', 'How do pickup enquiries work?'],
    placeholder: 'Ask about the menu or your visit…',
    hint: 'Menu, meal plans & reservations',
  };
}
''')
put(f/'lib/businesses/restaurant/the-rib-crib/config.ts','''import type { RestaurantChatPresentation } from '../shared/chat-config';

/** Presentation only. Runtime preset selection still comes from the resolved database route. */
export const ribCribSiteConfig = {
  // Retain existing session-storage and event contracts for returning guests.
  mealPlanStoragePrefix: 'ribcrib.meal-plan.v2',
  chat: {
    openEvent: 'ribcrib:jourvis',
    stateEvent: 'ribcrib:chat-state',
    panelId: 'rib-jourvis-panel',
    messageId: 'rib-jourvis-message',
    disclaimerId: 'rib-chat-disclaimer',
    quickPrompts: ['What are your bestsellers?', 'What do you recommend for 4 people?', 'Do you have unlimited wings?', 'I want to order for pickup.'],
    placeholder: 'Ask about ribs, platters, reservations…',
    hint: 'Menu, platters & reservations',
  } satisfies RestaurantChatPresentation,
} as const;
''')
put(f/'lib/businesses/registry.ts','''/** Presentation selection only: this registry must never create or authorize a public route. */
const sites = new Map([
  ['/restaurant/the-rib-crib', { id: 'the-rib-crib', adapterKey: 'restaurant' }],
] as const);

export type BusinessSiteId = 'the-rib-crib';

export function resolveBusinessSite(publicPath: string, adapterKey: string): BusinessSiteId | null {
  const site = (sites as ReadonlyMap<string, { id: BusinessSiteId; adapterKey: string }>).get(publicPath);
  return site?.adapterKey === adapterKey ? site.id : null;
}
''')
put(f/'components/business-sites/BusinessSiteRenderer.tsx','''import type { ComponentType } from 'react';
import BusinessDemoPage from '@/components/jourvis/BusinessDemoPage';
import { resolveBusinessSite, type BusinessSiteId } from '@/lib/businesses/registry';
import type { BusinessSiteProps } from '@/lib/businesses/types';

const renderers: Record<BusinessSiteId, () => Promise<{ default: ComponentType<BusinessSiteProps> }>> = {
  'the-rib-crib': () => import('./restaurant/the-rib-crib/RibCribPage'),
};

/** Server-side dispatch after database route resolution; generic demos remain the fallback. */
export default async function BusinessSiteRenderer({ business }: BusinessSiteProps) {
  const siteId = resolveBusinessSite(business.publicPath, business.adapterKey);
  if (!siteId) return <BusinessDemoPage key={business.publicPath} business={business} />;

  const { default: Site } = await renderers[siteId]();
  // A new route gets a new component instance, never another business's chat/meal-plan state.
  return <Site key={business.publicPath} business={business} />;
}
''')
for area,txt in [(f/'components/business-sites/restaurant/the-wild-tree',
'''# The Wild Tree presentation

Reserved for the separately designed WildTreePage and its local CSS module.
No renderer is registered yet; this folder does not publish a route.
Reuse ../shared/RestaurantJourvisChat with a business-scoped presentation config.
Do not import Rib Crib page styles or copy its section layout.
'''),(f/'lib/businesses/restaurant/the-wild-tree',
'''# The Wild Tree data package

Reserved for presentation content, asset mappings and configuration.
The supplied photo-based menu and explicitly labelled mock prices will be added
in the Wild Tree implementation, not in this structural refactor.
Do not reuse the Rib Crib runtime preset or menu binding.
Use ../shared/meal-plan.ts with this restaurant's own menu and formatter.
No Supabase record, capability preset or public route is created by this folder.
'''),(f/'src/assets/businesses/restaurant/the-wild-tree',
'''# The Wild Tree assets

Add approved derivative assets under branding/, food/, and atmosphere/.
Keep original reference images under source/ and map originals to derivatives.
Do not treat generated food images or mock prices as restaurant-verified data.
This refactor does not import or publish the supplied Wild Tree asset archive.
''')]:put(area/'README.md',txt)
put(r/'docs/archive/rib-crib-legacy/README.md','''# Inactive Rib Crib implementation archive

These files are retained for historical reference, not imported or bundled.
The six global CSS patch layers, old asset bridge, obsolete wrapper stylesheet,
and old embedded-image TypeScript modules belong to the superseded implementation.

The active restaurant lives at:
- frontend/components/business-sites/restaurant/the-rib-crib/
- frontend/lib/businesses/restaurant/the-rib-crib/
- frontend/src/assets/businesses/restaurant/the-rib-crib/

Chat rules still needed by the current page were extracted into the shared,
locally scoped RestaurantJourvisChat.module.css in original cascade order.
Historical imports/paths inside this archive are intentionally not rewritten.
''')
p=f/'package.json';pkg=json.loads(p.read_text());pkg['scripts']['test:frontend']='node --experimental-strip-types --test scripts/*.test.ts';pkg['scripts']['lint:jourvis']='oxlint app components/jourvis components/business-sites lib/jourvis lib/businesses scripts';put(p,json.dumps(pkg,indent=2)+'\n')
