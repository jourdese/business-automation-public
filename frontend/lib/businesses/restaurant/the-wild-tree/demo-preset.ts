import { wildTreeMenu, wildTreeMenuPolicy, WILD_TREE_PRESET_KEY, WILD_TREE_MENU_VERSION } from './menu.ts';

/** Menu-only draft. Activating a site or scheduling integration is a separate change. */
export const wildTreeDemoPreset = {
  preset_key: WILD_TREE_PRESET_KEY,
  name: 'The Wild Tree menu demo',
  description: 'Menu-only draft: 17 photo-backed dish names plus 34 invented concepts. All prices and availability are mock data.',
  version: 1,
  status: 'draft',
  metadata: {
    menuSeed: { version: WILD_TREE_MENU_VERSION, originalCount: 17, expansionCount: 34, totalCount: 51 },
    industry: { contract: 'industry-adapter.v1', adapterKey: 'restaurant' },
    demo: {
      ready: false, visible: false, displayName: 'The Wild Tree',
      fixture: {
        schemaVersion: 'jourvis-demo-fixture.v1', version: 1, sample: true,
        presetKey: WILD_TREE_PRESET_KEY, adapterKey: 'restaurant', vertical: 'restaurant',
        displayName: 'The Wild Tree', locale: 'en-PH', timezone: 'Asia/Manila',
        description: 'The Wild Tree menu-planning demo with photo-backed names and invented additions.',
        greeting: 'Hi! I’m Jourvis for The Wild Tree menu demo. Prices are fictional and some dishes are demo concepts. What would you like to explore?',
        aliases: ['the wild tree', 'wild tree'], selectionTerms: ['The Wild Tree', 'Wild Tree'],
        booking: { enabled: false, sendCalendarInvites: false },
        bookingNotice: 'This menu-only draft does not book tables, send invitations or submit kitchen orders.',
        services: [], hours: [], policies: [], hourExceptions: [],
        mockProfile: { businessName: 'The Wild Tree', currency: 'PHP', phone: null, email: null,
          paymentCollected: false, realStaffAvailable: false },
        restaurant: {
          menu: wildTreeMenu,
          menuPolicy: wildTreeMenuPolicy,
          allergyNotice: wildTreeMenuPolicy.allergyNotice,
          deliveryNotice: 'Pickup and delivery are enquiries only. No order is dispatched by this menu demo.',
        },
        faqs: [
          { faqKey: 'menu_sources', question: 'Is this the real menu?', terms: ['real menu', 'mock', 'demo', 'signatures'], priority: 30, active: true,
            answer: `${wildTreeMenuPolicy.menuNotice} ${wildTreeMenuPolicy.priceNotice}` },
          { faqKey: 'menu_prices', question: 'Are these actual prices?', terms: ['actual prices', 'demo prices', 'confirmed prices'], priority: 30, active: true,
            answer: wildTreeMenuPolicy.priceNotice },
          { faqKey: 'menu_charges', question: 'What about service charges?', terms: ['service charge', 'tax', 'fees'], priority: 30, active: true,
            answer: wildTreeMenuPolicy.chargesNotice },
          { faqKey: 'menu_allergies', question: 'Can you confirm ingredients?', terms: ['allergy', 'allergies', 'ingredients'], priority: 30, active: true,
            answer: `${wildTreeMenuPolicy.descriptionNotice} ${wildTreeMenuPolicy.allergyNotice}` },
        ],
      },
    },
  },
} as const;

/** Emit an explicit, idempotent INSERT-only seed; never update an existing restaurant. */
export function wildTreeSeedSql(): string {
  const payload = JSON.stringify(wildTreeDemoPreset);
  const delimiter = '$wild_tree_menu_payload$';
  if (payload.includes(delimiter)) throw new Error('Unsafe SQL payload delimiter.');
  return `BEGIN;
DO $wild_tree_seed$
DECLARE
  seed jsonb := ${delimiter}${payload}${delimiter}::jsonb;
  saved platform.capability_presets%ROWTYPE;
BEGIN
  IF seed->>'preset_key' <> 'demo_restaurant_the_wild_tree.v1' OR seed->>'status' <> 'draft' THEN
    RAISE EXCEPTION 'Only the Wild Tree menu-only draft may be seeded';
  END IF;
  INSERT INTO platform.capability_presets (preset_key, name, description, version, status, metadata)
  VALUES (seed->>'preset_key', seed->>'name', seed->>'description', (seed->>'version')::integer, seed->>'status', seed->'metadata')
  ON CONFLICT (preset_key) DO NOTHING;
  SELECT * INTO STRICT saved FROM platform.capability_presets WHERE preset_key=seed->>'preset_key' FOR UPDATE;
  IF saved.metadata IS DISTINCT FROM seed->'metadata' OR saved.status <> 'draft'
     OR saved.name IS DISTINCT FROM seed->>'name' OR saved.description IS DISTINCT FROM seed->>'description'
     OR saved.version IS DISTINCT FROM (seed->>'version')::integer THEN
    RAISE EXCEPTION 'Existing Wild Tree preset differs; inspect and reconcile instead of overwriting it';
  END IF;
END;
$wild_tree_seed$;
COMMIT;
`;
}
