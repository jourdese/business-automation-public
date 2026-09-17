import { marinaraMenu, marinaraMenuCounts, marinaraMenuPolicy, MARINARA_PRESET_KEY, MARINARA_MENU_VERSION } from './menu.ts';
import { marinaraMenuRows } from './menu-data.ts';
import { marinaraSources, marinaraResearchStatus, MARINARA_REVIEW_URL, MARINARA_RESEARCH_DATE } from './sources.ts';

/** A menu-only draft, not a live client identity, published route or ordering integration. */
export const marinaraDemoPreset = {
  preset_key: MARINARA_PRESET_KEY, name: 'Marinara Ristorante menu demo',
  description: 'Menu-only draft: 90 archived 2025 menu entries/variants plus 10 invented concepts. No prices or availability are verified current.',
  version: 1, status: 'draft',
  metadata: {
    menuSeed: { version: MARINARA_MENU_VERSION, originalCount: marinaraMenuCounts.original, expansionCount: marinaraMenuCounts.expansion, totalCount: marinaraMenuCounts.total },
    industry: { contract: 'industry-adapter.v1', adapterKey: 'restaurant' },
    research: { reviewedOn: MARINARA_RESEARCH_DATE, reviewUrl: MARINARA_REVIEW_URL, sourceRegistry: marinaraSources, status: marinaraResearchStatus },
    demo: {
      ready: false, visible: false, displayName: 'Marinara Ristorante',
      fixture: {
        schemaVersion: 'jourvis-demo-fixture.v1', version: 1, sample: true,
        presetKey: MARINARA_PRESET_KEY, adapterKey: 'restaurant', vertical: 'restaurant',
        displayName: 'Marinara Ristorante', locale: 'en-PH', timezone: 'Asia/Manila',
        description: 'Italian-American bistro menu demo using archived menu selections and proposed concepts.',
        greeting: 'Hi! I’m Jourvis for the Marinara Ristorante menu demo. Prices are demo values and some dishes are invented concepts. What would you like to explore?',
        aliases: ['marinara', 'marinara ristorante', 'marinara ristorante bistro and pub'],
        selectionTerms: ['Marinara Ristorante', 'Marinara'],
        booking: { enabled: false, sendCalendarInvites: false },
        bookingNotice: 'This menu-only draft does not book tables, send invitations or submit kitchen orders.',
        services: [], hours: [], policies: [], hourExceptions: [],
        mockProfile: { businessName: 'Marinara Ristorante', currency: 'PHP', phone: null, email: null, paymentCollected: false, realStaffAvailable: false },
        restaurant: { menu: marinaraMenu, menuPolicy: marinaraMenuPolicy, allergyNotice: marinaraMenuPolicy.allergyNotice,
          deliveryNotice: 'Pickup and delivery are enquiries only. No dispatch or service availability is confirmed by this demo.' },
        faqs: [
          { faqKey: 'menu_sources', question: 'Is this the current menu?', terms: ['real menu', 'current menu', 'mock', 'demo'], priority: 30, active: true, answer: marinaraMenuPolicy.menuNotice },
          { faqKey: 'menu_prices', question: 'Are these current restaurant prices?', terms: ['actual prices', 'confirmed prices', 'current prices'], priority: 30, active: true, answer: marinaraMenuPolicy.priceNotice },
          { faqKey: 'menu_variants', question: 'Is cheese-wheel pasta the same price as regular pasta?', terms: ['cheese wheel', 'sharing', 'solo', 'pizza size'], priority: 30, active: true, answer: marinaraMenuPolicy.variantNotice },
          { faqKey: 'menu_charges', question: 'Are service charges included?', terms: ['service charge', 'tax', 'fees'], priority: 30, active: true, answer: marinaraMenuPolicy.chargesNotice },
          { faqKey: 'menu_allergies', question: 'Can you confirm ingredients or allergens?', terms: ['allergy', 'allergens', 'ingredients'], priority: 30, active: true, answer: `${marinaraMenuPolicy.descriptionNotice} ${marinaraMenuPolicy.allergyNotice}` },
          { faqKey: 'location_reference', question: 'Where is the restaurant?', terms: ['location', 'address', 'where'], priority: 20, active: true, answer: `Published sources list ${marinaraResearchStatus.location.value}. Confirm the current location with the restaurant before travelling.` },
          { faqKey: 'hours_unverified', question: 'What are the opening hours?', terms: ['hours', 'open', 'close'], priority: 20, active: true, answer: 'Current opening hours have not been verified. Historical promotion hours are not operating hours; please confirm directly with Marinara.' },
        ],
      },
    },
  },
} as const;

/** Compact INSERT-only snapshot. Matches makeItem in menu.ts; existing differing records abort. */
export function marinaraSeedSql(): string {
  const base = JSON.parse(JSON.stringify(marinaraDemoPreset));
  base.metadata.demo.fixture.restaurant.menu = [];
  const payload = JSON.stringify({ preset: base, rows: marinaraMenuRows });
  const delimiter = '$marinara_payload$';
  if (payload.includes(delimiter) || payload.includes('$marinara_seed$')) throw new Error('Unsafe SQL delimiter.');
  return `BEGIN;
DO $marinara_seed$
DECLARE
  payload jsonb := ${delimiter}${payload}${delimiter}::jsonb;
  seed jsonb;
  menu jsonb;
  saved platform.capability_presets%ROWTYPE;
BEGIN
  seed := payload->'preset';
  SELECT jsonb_agg(jsonb_build_object(
    'key',r->>0, 'name',r->>1, 'category',r->>2, 'priceCents',((r->>3)::integer*100),
    'aliases',r->6, 'description',r->>5, 'active',true, 'available',true,
    'dishKey',r->>8, 'variant',r->7, 'printedName',r->>9,
    'isMock',(r->>4 IS NULL), 'source',CASE WHEN r->>4 IS NULL THEN 'mock-concept' ELSE 'archived-menu-photo' END,
    'sourceId',r->4, 'sourceUrl',CASE WHEN r->>4 IS NULL THEN NULL ELSE seed#>ARRAY['metadata','research','sourceRegistry',r->>4,'url'] END,
    'sourcePublicationDate',CASE WHEN r->>4 IS NULL THEN NULL ELSE '2025-04-06' END,
    'referencePriceCents',CASE WHEN r->>4 IS NULL THEN NULL ELSE ((r->>3)::integer*100) END,
    'priceSource','mock', 'descriptionSource','demo-copy', 'availabilitySource','demo-only', 'sourceAsset',NULL
  ) ORDER BY ord) INTO menu FROM jsonb_array_elements(payload->'rows') WITH ORDINALITY AS entries(r,ord);
  seed := jsonb_set(seed, '{metadata,demo,fixture,restaurant,menu}', menu);
  IF seed->>'preset_key' <> 'demo_restaurant_marinara_ristorante.v1' OR seed->>'status' <> 'draft'
     OR seed#>'{metadata,demo,ready}' <> 'false'::jsonb OR seed#>'{metadata,demo,visible}' <> 'false'::jsonb
     OR jsonb_array_length(menu) <> 100 THEN
    RAISE EXCEPTION 'Only the reviewed hidden Marinara menu draft may be seeded';
  END IF;
  IF (SELECT count(DISTINCT item->>'key') FROM jsonb_array_elements(menu) AS item) <> jsonb_array_length(menu) THEN
    RAISE EXCEPTION 'Duplicate Marinara menu keys';
  END IF;
  INSERT INTO platform.capability_presets (preset_key,name,description,version,status,metadata)
  VALUES (seed->>'preset_key',seed->>'name',seed->>'description',(seed->>'version')::integer,seed->>'status',seed->'metadata')
  ON CONFLICT (preset_key) DO NOTHING;
  SELECT * INTO STRICT saved FROM platform.capability_presets WHERE preset_key=seed->>'preset_key' FOR UPDATE;
  IF saved.metadata IS DISTINCT FROM seed->'metadata' OR saved.status <> 'draft'
     OR saved.name IS DISTINCT FROM seed->>'name' OR saved.description IS DISTINCT FROM seed->>'description'
     OR saved.version IS DISTINCT FROM (seed->>'version')::integer THEN
    RAISE EXCEPTION 'Existing Marinara preset differs; inspect before updating';
  END IF;
END;
$marinara_seed$;
COMMIT;
`;
}
