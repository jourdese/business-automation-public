export type PublicBusinessRoute = {
  vertical_slug: string;
  business_slug: string;
  public_path: string;
  display_name: string;
  adapter_key: string;
  is_demo: boolean;
};

const SUPABASE_URL = 'https://pqdagfmhixblthnrfdcv.supabase.co';
// Supabase publishable keys are intended for public clients. Row access is still
// constrained by the database grants and RLS policy on the route source table.
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ujHCyx5WcG3ziS8q56Tf_g_qd4h7LNj';
const ROUTE_COLUMNS =
  'vertical_slug,business_slug,public_path,display_name,adapter_key,is_demo';
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function endpoint(params: URLSearchParams) {
  return `${SUPABASE_URL}/rest/v1/public_business_routes?${params.toString()}`;
}

async function readRoutes(params: URLSearchParams): Promise<PublicBusinessRoute[]> {
  const response = await fetch(endpoint(params), {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Accept: 'application/json',
    },
    cache: 'force-cache',
  });

  if (!response.ok) {
    throw new Error(`Unable to load Jourvis public business routes (${response.status}).`);
  }

  const value = (await response.json()) as unknown;
  if (!Array.isArray(value)) throw new Error('Jourvis public business route response is invalid.');
  return value as PublicBusinessRoute[];
}

export function validPublicSlug(value: string) {
  return SLUG.test(value);
}

export async function listPublicBusinessRoutes() {
  const params = new URLSearchParams({
    select: ROUTE_COLUMNS,
    order: 'public_path.asc',
  });
  return readRoutes(params);
}

export async function resolvePublicBusinessRoute(vertical: string, business: string) {
  if (!validPublicSlug(vertical) || !validPublicSlug(business)) return null;

  const params = new URLSearchParams({
    select: ROUTE_COLUMNS,
    vertical_slug: `eq.${vertical}`,
    business_slug: `eq.${business}`,
    limit: '1',
  });
  const routes = await readRoutes(params);
  return routes[0] ?? null;
}
