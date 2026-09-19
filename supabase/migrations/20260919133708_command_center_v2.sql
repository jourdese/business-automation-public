-- Additive V2 boundary. Existing platform records and n8n workflows are untouched.
create schema cc_private;
revoke all on schema cc_private from public;

create table cc_private.restaurants (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references platform.businesses(id),
  slug text not null unique, name text not null, timezone text not null default 'Asia/Manila',
  demo boolean not null default true, accepting_orders boolean not null default false,
  jourvis_mode text not null default 'sleeping' check (jourvis_mode in ('sleeping','watch','contact','buy')),
  per_order_limit bigint not null default 0 check(per_order_limit>=0),
  daily_limit bigint not null default 0 check(daily_limit>=0),
  integrations_ready boolean not null default false,
  seed_version text, seed_date date, created_at timestamptz not null default now()
);
create table cc_private.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check(length(display_name) between 1 and 100), created_at timestamptz not null default now()
);
create table cc_private.stations (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references cc_private.restaurants(id),
  label text not null, token uuid not null unique default gen_random_uuid(), enabled boolean not null default false,
  unique(restaurant_id,label), unique(restaurant_id,id)
);
create table cc_private.ingredients (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references cc_private.restaurants(id),
  code text not null, name text not null, unit text not null check(unit in ('kg','L','each')),
  on_hand numeric(16,4) not null default 0 check(on_hand>=0), reserved numeric(16,4) not null default 0 check(reserved>=0 and reserved<=on_hand),
  average_cost numeric(16,4) not null default 0 check(average_cost>=0), reorder_at numeric(16,4) not null default 0 check(reorder_at>=0),
  unique(restaurant_id,code), unique(restaurant_id,id)
);
create table cc_private.menu_items (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references cc_private.restaurants(id),
  code text not null, name text not null, category text not null, description text not null default '', image text not null,
  price bigint not null check(price>=0), available boolean not null default true, allergens text[] not null default '{}',
  recipe_version integer not null default 1 check(recipe_version>0), sort_order integer not null,
  unique(restaurant_id,code), unique(restaurant_id,id)
);
create table cc_private.recipe_lines (
  restaurant_id uuid not null, menu_item_id uuid not null, version integer not null check(version>0),
  ingredient_id uuid not null, quantity numeric(16,4) not null check(quantity>0),
  primary key(menu_item_id,version,ingredient_id),
  foreign key(restaurant_id,menu_item_id) references cc_private.menu_items(restaurant_id,id),
  foreign key(restaurant_id,ingredient_id) references cc_private.ingredients(restaurant_id,id)
);
create table cc_private.orders (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references cc_private.restaurants(id),
  station_id uuid, receipt_token uuid not null default gen_random_uuid(), request_key uuid not null,
  request_fingerprint jsonb not null, status text not null default 'NEW' check(status in ('NEW','ACCEPTED','PREPARING','READY','COMPLETED','CANCELLED')),
  origin text not null check(origin in ('seed','customer','manual')), note text not null default '' check(length(note)<=500),
  total bigint not null default 0 check(total>=0), food_cost bigint not null default 0 check(food_cost>=0),
  created_at timestamptz not null default now(), accepted_at timestamptz, prepared_at timestamptz, completed_at timestamptz,
  cancelled_at timestamptz, cancellation_reason text,
  foreign key(restaurant_id,station_id) references cc_private.stations(restaurant_id,id),
  unique(restaurant_id,request_key), unique(restaurant_id,id)
);
create index cc_orders_status on cc_private.orders(restaurant_id,status,created_at desc);
create table cc_private.order_items (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null, order_id uuid not null,
  menu_item_id uuid not null, name text not null, unit_price bigint not null check(unit_price>=0), quantity integer not null check(quantity between 1 and 20),
  recipe_version integer,
  foreign key(restaurant_id,order_id) references cc_private.orders(restaurant_id,id),
  foreign key(restaurant_id,menu_item_id) references cc_private.menu_items(restaurant_id,id)
);
create index cc_order_items_order on cc_private.order_items(order_id);
create table cc_private.order_usage (
  restaurant_id uuid not null, order_id uuid not null, ingredient_id uuid not null, quantity numeric(16,4) not null check(quantity>0),
  unit_cost numeric(16,4) not null check(unit_cost>=0), primary key(order_id,ingredient_id),
  foreign key(restaurant_id,order_id) references cc_private.orders(restaurant_id,id),
  foreign key(restaurant_id,ingredient_id) references cc_private.ingredients(restaurant_id,id)
);
create table cc_private.stock_movements (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null, ingredient_id uuid not null,
  kind text not null check(kind in ('opening','usage','receiving','waste','count','cancelled_prepared')),
  quantity numeric(16,4) not null, unit_cost numeric(16,4) not null check(unit_cost>=0),
  reference text not null, reason text not null, actor_id uuid references auth.users(id), created_at timestamptz not null default now(),
  foreign key(restaurant_id,ingredient_id) references cc_private.ingredients(restaurant_id,id), unique(ingredient_id,kind,reference)
);
create index cc_stock_history on cc_private.stock_movements(restaurant_id,created_at desc);
create table cc_private.suppliers (
  id uuid primary key default gen_random_uuid(), name text not null, contact_email text not null, phone text not null default '',
  areas text not null, lead_days integer not null check(lead_days between 0 and 365), minimum_order bigint not null check(minimum_order>=0),
  terms text not null default '', demo boolean not null default false, created_at timestamptz not null default now()
);
create table cc_private.supplier_members (
  supplier_id uuid not null references cc_private.suppliers(id), user_id uuid not null references auth.users(id),
  primary key(supplier_id,user_id)
);
create table cc_private.supplier_links (
  restaurant_id uuid not null references cc_private.restaurants(id), supplier_id uuid not null references cc_private.suppliers(id),
  status text not null default 'pending' check(status in ('pending','approved','disabled')),
  primary key(restaurant_id,supplier_id)
);
create table cc_private.supplier_products (
  id uuid primary key default gen_random_uuid(), supplier_id uuid not null references cc_private.suppliers(id),
  sku text not null, name text not null, category text not null, unit text not null check(unit in ('kg','L','each')),
  pack_size numeric(16,4) not null check(pack_size>0), pack_price bigint not null check(pack_price>0),
  available boolean not null default true, version integer not null default 1,
  unique(supplier_id,sku), unique(supplier_id,id)
);
create table cc_private.purchases (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references cc_private.restaurants(id), supplier_id uuid not null,
  product_id uuid not null, ingredient_id uuid not null, request_key uuid not null, packs integer not null check(packs between 1 and 1000),
  pack_size numeric(16,4) not null check(pack_size>0), pack_price bigint not null check(pack_price>0), delivery_fee bigint not null default 0 check(delivery_fee>=0),
  status text not null default 'DRAFT' check(status in ('DRAFT','QUOTE_REQUESTED','QUOTED','APPROVED','CONFIRMED','PARTIAL','RECEIVED','CANCELLED')),
  received numeric(16,4) not null default 0 check(received>=0 and received<=packs*pack_size), version integer not null default 1,
  approved_version integer, approved_by uuid references auth.users(id), authority_source text check(authority_source in ('owner','rule')),
  hard_pack_limit bigint not null default 0 check(hard_pack_limit>=0), target_pack_price bigint not null default 0 check(target_pack_price>=0),
  auto_pack_limit bigint not null default 0 check(auto_pack_limit>=0),
  approved_at timestamptz, supplier_reference text, terms text not null default '', origin text not null default 'manual' check(origin in ('seed','manual','jourvis')),
  created_at timestamptz not null default now(), confirmed_at timestamptz,
  foreign key(restaurant_id,supplier_id) references cc_private.supplier_links(restaurant_id,supplier_id),
  foreign key(supplier_id,product_id) references cc_private.supplier_products(supplier_id,id),
  foreign key(restaurant_id,ingredient_id) references cc_private.ingredients(restaurant_id,id),
  unique(restaurant_id,request_key), unique(restaurant_id,id)
);
create index cc_purchase_status on cc_private.purchases(restaurant_id,status,created_at desc);
create table cc_private.receipts (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null, purchase_id uuid not null, request_key uuid not null,
  quantity numeric(16,4) not null check(quantity>0), reference text not null, actor_id uuid references auth.users(id), created_at timestamptz not null default now(),
  foreign key(restaurant_id,purchase_id) references cc_private.purchases(restaurant_id,id), unique(purchase_id,request_key)
);
create table cc_private.activity (
  id bigint generated always as identity primary key, restaurant_id uuid not null references cc_private.restaurants(id),
  actor_id uuid references auth.users(id), kind text not null, record_id uuid, summary text not null,
  details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index cc_activity_recent on cc_private.activity(restaurant_id,created_at desc);
create table cc_private.external_jobs (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references cc_private.restaurants(id),
  purchase_id uuid, kind text not null check(kind in ('supplier_quote_request','supplier_purchase','staff_notification')),
  idempotency_key text not null unique, status text not null default 'queued' check(status in ('queued','leased','succeeded','failed','uncertain','cancelled')),
  dispatch_started_at timestamptz, payload jsonb not null, attempts integer not null default 0, lease_token uuid, lease_until timestamptz, provider_receipt text, error_code text,
  created_at timestamptz not null default now(), finished_at timestamptz,
  foreign key(restaurant_id,purchase_id) references cc_private.purchases(restaurant_id,id)
);
create index cc_jobs_pending on cc_private.external_jobs(status,created_at) where status in ('queued','leased');
create table cc_private.external_attempts (
  id bigint generated always as identity primary key, job_id uuid not null references cc_private.external_jobs(id), lease_token uuid not null,
  status text not null, provider_receipt text, created_at timestamptz not null default now()
);
create table cc_private.invites (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references cc_private.restaurants(id),
  email text not null, role text not null check(role in ('owner','admin','editor','viewer','supplier')),
  token uuid not null unique default gen_random_uuid(), expires_at timestamptz not null default now()+interval '7 days', accepted_at timestamptz,
  invited_by uuid references auth.users(id)
);
create table public.cc_changes (
  id bigint generated always as identity primary key, business_id uuid not null references platform.businesses(id), changed_at timestamptz not null default now()
);
create index cc_changes_business on public.cc_changes(business_id,id);
alter table public.cc_changes enable row level security;

-- Private definer code is necessary for atomic commands: clients have no table-write grants.
-- Authorization is checked from auth.uid() + verified auth.users + current DB membership on every call.
create function cc_private.verified_user() returns uuid language sql stable security definer set search_path='' as $$
  select id from auth.users where id=(select auth.uid()) and email_confirmed_at is not null
$$;
create function cc_private.can_access(b uuid, write_access boolean default false, owner_access boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from platform.business_memberships bm where bm.business_id=b and bm.user_id=cc_private.verified_user()
  and bm.status='active' and (not write_access or bm.member_role in ('owner','admin','editor')) and (not owner_access or bm.member_role in ('owner','admin')))
$$;
create function cc_private.require_access(r uuid, write_access boolean default false, owner_access boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from cc_private.restaurants where id=r and cc_private.can_access(business_id,write_access,owner_access)) then
    raise exception 'Access denied' using errcode='42501';
  end if;
end $$;

-- One rule per ingredient. Only an owner/admin can authorize a product and ceilings.
create table cc_private.reorder_rules (
  restaurant_id uuid not null, ingredient_id uuid not null, product_id uuid not null references cc_private.supplier_products(id),
  packs integer not null check(packs between 1 and 1000), enabled boolean not null default false,
  target_pack_price bigint not null check(target_pack_price>=0), auto_pack_limit bigint not null check(auto_pack_limit>=target_pack_price),
  hard_pack_limit bigint not null check(hard_pack_limit>=auto_pack_limit), approved_terms text not null default '',
  authorized_by uuid not null references auth.users(id), primary key(restaurant_id,ingredient_id),
  foreign key(restaurant_id,ingredient_id) references cc_private.ingredients(restaurant_id,id)
);
-- The application worker receives only a per-business capability, never a service-role key.
create table cc_private.runtime_grants (
  restaurant_id uuid primary key references cc_private.restaurants(id), token_hash text not null unique,
  enabled boolean not null default false, created_at timestamptz not null default now()
);

create function cc_private.evaluate(r uuid) returns void language plpgsql security definer set search_path='' as $$
declare cfg cc_private.restaurants; rule cc_private.reorder_rules; product cc_private.supplier_products;
  supplier cc_private.suppliers; ingredient cc_private.ingredients; po cc_private.purchases; incoming numeric; committed bigint; total bigint;
begin
  select * into cfg from cc_private.restaurants where id=r for update;
  if cfg.jourvis_mode in ('sleeping','watch') then return; end if;
  if not cfg.integrations_ready then return; end if;
  for rule in select * from cc_private.reorder_rules where restaurant_id=r and enabled order by ingredient_id loop
    -- Revoking the rule author's business authority also revokes the rule's authority.
    if not exists(select 1 from platform.business_memberships bm join auth.users u on u.id=bm.user_id where bm.business_id=cfg.business_id and bm.user_id=rule.authorized_by and bm.status='active' and bm.member_role in ('owner','admin') and u.email_confirmed_at is not null) then continue; end if;
    select * into product from cc_private.supplier_products where id=rule.product_id and available;
    if not found then continue; end if;
    select s.* into supplier from cc_private.suppliers s join cc_private.supplier_links l on l.supplier_id=s.id where s.id=product.supplier_id and l.restaurant_id=r and l.status='approved';
    if not found then continue; end if;
    select * into ingredient from cc_private.ingredients where id=rule.ingredient_id;
    if product.unit<>ingredient.unit then continue; end if;
    select coalesce(sum(packs*pack_size-received),0) into incoming from cc_private.purchases where restaurant_id=r and ingredient_id=ingredient.id and status in ('CONFIRMED','PARTIAL');
    if ingredient.on_hand-ingredient.reserved+incoming<ingredient.reorder_at and not exists(select 1 from cc_private.purchases where restaurant_id=r and ingredient_id=ingredient.id and status not in ('RECEIVED','CANCELLED')) then
      insert into cc_private.purchases(restaurant_id,supplier_id,product_id,ingredient_id,request_key,packs,pack_size,pack_price,status,hard_pack_limit,auto_pack_limit,target_pack_price,origin)
      values(r,supplier.id,product.id,ingredient.id,gen_random_uuid(),rule.packs,product.pack_size,product.pack_price,'QUOTE_REQUESTED',rule.hard_pack_limit,rule.auto_pack_limit,rule.target_pack_price,'jourvis') returning * into po;
      perform cc_private.record(r,'jourvis.quote_requested',po.id,'Low stock: supplier quotation requested in the portal');
      if not supplier.demo and supplier.contact_email not like '%.invalid' then
        insert into cc_private.external_jobs(restaurant_id,purchase_id,kind,idempotency_key,payload) values(r,po.id,'supplier_quote_request',po.id::text||':'||po.version::text||':QUOTE_REQUESTED',jsonb_build_object('version',po.version,'automatic',true)) on conflict do nothing;
      end if;
    end if;
    if cfg.jourvis_mode<>'buy' then continue; end if;
    for po in select * from cc_private.purchases where restaurant_id=r and ingredient_id=ingredient.id and product_id=rule.product_id and status='QUOTED' order by created_at for update loop
      total:=po.packs*po.pack_price+po.delivery_fee;
      select coalesce(sum(packs*pack_price+delivery_fee),0) into committed from cc_private.purchases where restaurant_id=r and status in ('APPROVED','CONFIRMED','PARTIAL','RECEIVED') and (approved_at at time zone cfg.timezone)::date=(now() at time zone cfg.timezone)::date;
      if po.packs<>rule.packs or po.pack_price>least(po.auto_pack_limit,po.hard_pack_limit,rule.auto_pack_limit,rule.hard_pack_limit) or total>cfg.per_order_limit or committed+total>cfg.daily_limit or total<supplier.minimum_order or po.terms<>rule.approved_terms then continue; end if;
      update cc_private.purchases set status='APPROVED',approved_version=version,approved_by=rule.authorized_by,approved_at=now(),authority_source='rule' where id=po.id;
      perform cc_private.record(r,'jourvis.purchase_authorized',po.id,'Purchase authorized within current owner limits',jsonb_build_object('version',po.version,'total',total,'dailyCommittedBefore',committed));
      if not supplier.demo and supplier.contact_email not like '%.invalid' then
        insert into cc_private.external_jobs(restaurant_id,purchase_id,kind,idempotency_key,payload) values(r,po.id,'supplier_purchase',po.id::text||':'||po.version::text||':APPROVED',jsonb_build_object('version',po.version,'automatic',true)) on conflict do nothing;
      end if;
    end loop;
  end loop;
end $$;

create function cc_private.save_rule(r uuid,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform cc_private.require_access(r,true,true);
  if not exists(select 1 from cc_private.supplier_products sp join cc_private.supplier_links l on l.supplier_id=sp.supplier_id join cc_private.ingredients i on i.restaurant_id=l.restaurant_id and i.unit=sp.unit where l.restaurant_id=r and l.status='approved' and sp.id=(p->>'productId')::uuid and i.id=(p->>'ingredientId')::uuid) then raise exception 'Choose a matching product from an approved supplier'; end if;
  insert into cc_private.reorder_rules(restaurant_id,ingredient_id,product_id,packs,enabled,target_pack_price,auto_pack_limit,hard_pack_limit,approved_terms,authorized_by)
  values(r,(p->>'ingredientId')::uuid,(p->>'productId')::uuid,(p->>'packs')::int,(p->>'enabled')::boolean,(p->>'target')::bigint,(p->>'autoLimit')::bigint,(p->>'hardLimit')::bigint,left(coalesce(p->>'terms',''),1000),auth.uid())
  on conflict(restaurant_id,ingredient_id) do update set product_id=excluded.product_id,packs=excluded.packs,enabled=excluded.enabled,target_pack_price=excluded.target_pack_price,auto_pack_limit=excluded.auto_pack_limit,hard_pack_limit=excluded.hard_pack_limit,approved_terms=excluded.approved_terms,authorized_by=excluded.authorized_by;
  perform cc_private.record(r,'rule.authorized',(p->>'ingredientId')::uuid,'Owner updated ingredient purchasing authority');
  perform cc_private.evaluate(r);
  return jsonb_build_object('saved',true);
end $$;

create function cc_private.claim_job(r uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare job cc_private.external_jobs; po cc_private.purchases; supplier cc_private.suppliers; cfg cc_private.restaurants;
begin
  select * into cfg from cc_private.restaurants where id=r for update;
  update cc_private.external_jobs set status='uncertain',error_code='lease_expired',finished_at=now() where restaurant_id=r and status='leased' and lease_until<now();
  if not cfg.integrations_ready then return null; end if;
  select * into job from cc_private.external_jobs where restaurant_id=r and status='queued' order by created_at for update skip locked limit 1;
  if not found then return null; end if;
  select * into po from cc_private.purchases where id=job.purchase_id;
  select * into supplier from cc_private.suppliers where id=po.supplier_id;
  if po.id is null or supplier.demo or supplier.contact_email like '%.invalid' or po.version is distinct from (job.payload->>'version')::int or
    (job.kind='supplier_purchase' and (po.status<>'APPROVED' or po.approved_version is distinct from po.version)) or
    (job.kind='supplier_quote_request' and po.status<>'QUOTE_REQUESTED') or
    (coalesce((job.payload->>'automatic')::boolean,false) and (cfg.jourvis_mode not in ('contact','buy') or (job.kind='supplier_purchase' and cfg.jourvis_mode<>'buy'))) or
    not exists(select 1 from cc_private.supplier_links where restaurant_id=r and supplier_id=supplier.id and status='approved') then
    update cc_private.external_jobs set status='cancelled',finished_at=now() where id=job.id; return null;
  end if;
  if job.kind='supplier_purchase' and coalesce((job.payload->>'automatic')::boolean,false) and not exists(
    select 1 from cc_private.reorder_rules rule join platform.business_memberships bm on bm.user_id=rule.authorized_by and bm.business_id=cfg.business_id
    where rule.restaurant_id=r and rule.ingredient_id=po.ingredient_id and rule.product_id=po.product_id and rule.enabled
    and bm.status='active' and bm.member_role in ('owner','admin') and po.packs=rule.packs and po.terms=rule.approved_terms
    and po.pack_price<=least(rule.auto_pack_limit,rule.hard_pack_limit,po.auto_pack_limit,po.hard_pack_limit)
    and po.packs*po.pack_price+po.delivery_fee between supplier.minimum_order and cfg.per_order_limit
    and (select coalesce(sum(packs*pack_price+delivery_fee),0) from cc_private.purchases where restaurant_id=r and status in ('APPROVED','CONFIRMED','PARTIAL','RECEIVED') and (approved_at at time zone cfg.timezone)::date=(now() at time zone cfg.timezone)::date)<=cfg.daily_limit
    and (po.approved_at at time zone cfg.timezone)::date=(now() at time zone cfg.timezone)::date
  ) then
    update cc_private.external_jobs set status='cancelled',finished_at=now() where id=job.id;
    update cc_private.purchases set status='QUOTED',approved_version=null,approved_by=null,approved_at=null,authority_source=null where id=po.id;
    perform cc_private.record(r,'purchase.authority_changed',po.id,'Purchase returned for review because current authority changed'); return null;
  end if;
  update cc_private.external_jobs set status='leased',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '90 seconds' where id=job.id returning * into job;
  insert into cc_private.external_attempts(job_id,lease_token,status) values(job.id,job.lease_token,'leased');
  return jsonb_build_object('id',job.id,'restaurantId',r,'kind',job.kind,'leaseToken',job.lease_token,'idempotencyKey',job.idempotency_key,'recipient',supplier.contact_email,
    'purchase',jsonb_build_object('id',po.id,'version',po.version,'packs',po.packs,'packSize',po.pack_size,'packPrice',po.pack_price,'deliveryFee',po.delivery_fee,'terms',po.terms,'product',(select name from cc_private.supplier_products where id=po.product_id)));
end $$;

create function cc_private.worker(token text,op text,p jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare r uuid; result jsonb;
begin
  if length(token)<40 or octet_length(p::text)>16384 then raise exception 'Worker access denied' using errcode='42501'; end if;
  select restaurant_id into r from cc_private.runtime_grants where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') and enabled;
  if r is null then raise exception 'Worker access denied' using errcode='42501'; end if;
  if op='claim' then return cc_private.claim_job(r); end if;
  if op='finish' and exists(select 1 from cc_private.external_jobs where id=(p->>'id')::uuid and restaurant_id=r) then return cc_private.api('job_result',p); end if;
  raise exception 'Unsupported worker operation' using errcode='42501';
end $$;
create function public.cc_worker(token text,op text,p jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select cc_private.worker(token,op,p) $$;
revoke all on function public.cc_worker(text,text,jsonb) from public;
grant execute on function public.cc_worker(text,text,jsonb) to anon,authenticated;

create function cc_private.purchase_command(op text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r uuid:=(p->>'restaurantId')::uuid; po cc_private.purchases; product cc_private.supplier_products;
  g cc_private.ingredients; q numeric; ref text; existing cc_private.receipts; unit_cost numeric; cfg cc_private.restaurants; committed bigint;
begin
  perform cc_private.require_access(r,true,op in ('approve_purchase','confirm_purchase','cancel_purchase'));
  select * into cfg from cc_private.restaurants where id=r for update;
  if op='create_purchase' then
    select * into po from cc_private.purchases where restaurant_id=r and request_key=(p->>'requestKey')::uuid;
    if found then
      if po.product_id is distinct from (p->>'productId')::uuid or po.ingredient_id is distinct from (p->>'ingredientId')::uuid or po.packs is distinct from (p->>'packs')::int then raise exception 'Request key already used'; end if;
      return to_jsonb(po);
    end if;
    select s.* into product from cc_private.supplier_products s join cc_private.supplier_links l on l.supplier_id=s.supplier_id
      where s.id=(p->>'productId')::uuid and s.available and l.restaurant_id=r and l.status='approved';
    if not found then raise exception 'Choose an available product from an approved supplier'; end if;
    select * into g from cc_private.ingredients where id=(p->>'ingredientId')::uuid and restaurant_id=r;
    if not found or g.unit<>product.unit then raise exception 'Ingredient and supplier product units must match'; end if;
    insert into cc_private.purchases(restaurant_id,supplier_id,product_id,ingredient_id,request_key,packs,pack_size,pack_price,hard_pack_limit)
      values(r,product.supplier_id,product.id,g.id,(p->>'requestKey')::uuid,(p->>'packs')::int,product.pack_size,product.pack_price,product.pack_price) returning * into po;
    perform cc_private.record(r,'purchase.created',po.id,'Purchase draft created');
    return to_jsonb(po);
  end if;
  select * into po from cc_private.purchases where restaurant_id=r and id=(p->>'id')::uuid for update;
  if not found then raise exception 'Purchase not found'; end if;
  if op='receive_purchase' then
    select * into existing from cc_private.receipts where purchase_id=po.id and request_key=(p->>'requestKey')::uuid;
    if found then
      if existing.quantity is distinct from (p->>'quantity')::numeric or existing.reference is distinct from p->>'reference' then raise exception 'Request key already used'; end if;
      return to_jsonb(po);
    end if;
    if po.status not in ('CONFIRMED','PARTIAL') then raise exception 'Only a confirmed purchase can be received'; end if;
    q:=(p->>'quantity')::numeric; ref:=trim(p->>'reference');
    if q is null or q<=0 or q>po.packs*po.pack_size-po.received or length(coalesce(ref,'')) not between 2 and 200 then raise exception 'Enter the physically accepted quantity and receipt reference'; end if;
    select * into g from cc_private.ingredients where id=po.ingredient_id for update;
    unit_cost:=(po.packs*po.pack_price+po.delivery_fee)::numeric/(po.packs*po.pack_size);
    insert into cc_private.receipts(restaurant_id,purchase_id,request_key,quantity,reference,actor_id)
      values(r,po.id,(p->>'requestKey')::uuid,q,ref,auth.uid());
    update cc_private.ingredients set average_cost=(on_hand*average_cost+q*unit_cost)/(on_hand+q),on_hand=on_hand+q where id=g.id;
    insert into cc_private.stock_movements(restaurant_id,ingredient_id,kind,quantity,unit_cost,reference,reason,actor_id)
      values(r,g.id,'receiving',q,unit_cost,p->>'requestKey',ref,auth.uid());
    update cc_private.purchases set received=received+q,status=case when received+q=packs*pack_size then 'RECEIVED' else 'PARTIAL' end where id=po.id;
    perform cc_private.record(r,'purchase.received',po.id,'Delivery physically received',jsonb_build_object('quantity',q,'reference',ref));
  elsif op='request_quote' then
    if exists(select 1 from cc_private.external_jobs where purchase_id=po.id and kind='supplier_purchase' and status in ('leased','uncertain','succeeded')) then raise exception 'Reconcile the supplier commitment before changing this purchase'; end if;
    if po.status not in ('DRAFT','QUOTED') then raise exception 'This purchase cannot request another quote'; end if;
    update cc_private.purchases set status='QUOTE_REQUESTED',approved_version=null,approved_by=null,authority_source=null where id=po.id;
    perform cc_private.record(r,'purchase.quote_requested',po.id,'Quotation requested in supplier portal');
  elsif op='approve_purchase' then
    if po.status='APPROVED' and po.approved_version=po.version then return to_jsonb(po); end if;
    if po.status not in ('DRAFT','QUOTED') or po.version is distinct from (p->>'expectedVersion')::int then raise exception 'Quote changed. Review the latest price, quantity and terms.'; end if;
    if po.pack_price>po.hard_pack_limit and p->>'overrideReason' is null then raise exception 'This price exceeds the hard limit. Record why you authorize the exception.'; end if;
    if po.pack_price>po.hard_pack_limit and length(trim(p->>'overrideReason'))<5 then raise exception 'Please explain this authority exception'; end if;
    update cc_private.purchases set status='APPROVED',approved_version=version,approved_by=auth.uid(),authority_source='owner',approved_at=now() where id=po.id;
    perform cc_private.record(r,'purchase.approved',po.id,'Owner approved purchase terms',jsonb_build_object('version',po.version,'total',po.packs*po.pack_price+po.delivery_fee,'overrideReason',p->>'overrideReason'));
  elsif op='confirm_purchase' then
    if po.status='CONFIRMED' then return to_jsonb(po); end if;
    if po.status<>'APPROVED' or po.approved_version is distinct from po.version or po.version is distinct from (p->>'expectedVersion')::int then raise exception 'Current terms need approval before confirmation'; end if;
    if length(trim(coalesce(p->>'reference',''))) not between 2 and 200 then raise exception 'Record the supplier confirmation reference'; end if;
    update cc_private.purchases set status='CONFIRMED',confirmed_at=now(),supplier_reference=p->>'reference' where id=po.id;
    perform cc_private.record(r,'purchase.confirmed',po.id,'Supplier commitment recorded',jsonb_build_object('reference',p->>'reference'));
  elsif op='cancel_purchase' then
    if exists(select 1 from cc_private.external_jobs where purchase_id=po.id and kind='supplier_purchase' and status in ('leased','uncertain','succeeded')) then raise exception 'Reconcile the supplier commitment before cancelling'; end if;
    if po.status='CANCELLED' then return to_jsonb(po); end if;
    if po.status in ('CONFIRMED','PARTIAL','RECEIVED') then raise exception 'Contact the supplier to resolve an existing commitment. It cannot be erased here.'; end if;
    update cc_private.purchases set status='CANCELLED' where id=po.id;
    update cc_private.external_jobs set status='cancelled',finished_at=now() where purchase_id=po.id and status='queued';
    perform cc_private.record(r,'purchase.cancelled',po.id,'Uncommitted purchase cancelled');
  elsif op='queue_supplier_contact' then
    perform cc_private.require_access(r,true,true);
    if exists(select 1 from cc_private.suppliers where id=po.supplier_id and (demo or contact_email like '%.invalid')) then raise exception 'Demo suppliers use the portal only. No external message was queued.'; end if;
    if not cfg.integrations_ready then raise exception 'Supplier messaging is not connected. The portal and manual purchasing remain available.'; end if;
    if po.status not in ('QUOTE_REQUESTED','APPROVED') then raise exception 'Request a quote or approve current terms before contacting the supplier'; end if;
    if po.status='APPROVED' and po.approved_version is distinct from po.version then raise exception 'Terms changed after approval'; end if;
    insert into cc_private.external_jobs(restaurant_id,purchase_id,kind,idempotency_key,payload)
    values(r,po.id,case when po.status='APPROVED' then 'supplier_purchase' else 'supplier_quote_request' end,
      po.id::text||':'||po.version::text||':'||po.status,jsonb_build_object('purchaseId',po.id,'version',po.version)) on conflict(idempotency_key) do nothing;
    perform cc_private.record(r,'supplier.contact_queued',po.id,'Supplier communication queued');
  else raise exception 'Unknown purchase command'; end if;
  perform cc_private.evaluate(r);
  select * into po from cc_private.purchases where id=po.id;
  return to_jsonb(po);
end $$;

create function cc_private.supplier_command(op text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=cc_private.verified_user(); sid uuid; supplier cc_private.suppliers; product cc_private.supplier_products; po cc_private.purchases; invitation cc_private.invites;
begin
  if uid is null then raise exception 'Verify your email to continue' using errcode='42501'; end if;
  if op='register_supplier' then
    if exists(select 1 from cc_private.supplier_members where user_id=uid) then raise exception 'Your supplier account already exists'; end if;
    if length(trim(coalesce(p->>'name',''))) not between 2 and 150 or length(trim(coalesce(p->>'areas',''))) not between 2 and 500 then raise exception 'Add your company name and delivery areas'; end if;
    insert into cc_private.suppliers(name,contact_email,phone,areas,lead_days,minimum_order,terms)
      select trim(p->>'name'),email,left(coalesce(p->>'phone',''),40),p->>'areas',(p->>'leadDays')::int,(p->>'minimumOrder')::bigint,left(coalesce(p->>'terms',''),1000) from auth.users where id=uid returning * into supplier;
    insert into cc_private.supplier_members(supplier_id,user_id) values(supplier.id,uid);
    return to_jsonb(supplier);
  end if;
  sid:=(p->>'supplierId')::uuid;
  if not exists(select 1 from cc_private.supplier_members where supplier_id=sid and user_id=uid) then raise exception 'Supplier access denied' using errcode='42501'; end if;
  if op='save_supplier_product' then
    if length(trim(coalesce(p->>'name',''))) not between 2 and 150 or length(coalesce(p->>'sku','')) not between 1 and 80 then raise exception 'Add a product name and SKU'; end if;
    if p->>'id' is null then
      insert into cc_private.supplier_products(supplier_id,sku,name,category,unit,pack_size,pack_price,available)
        values(sid,p->>'sku',p->>'name',left(coalesce(p->>'category','Other'),100),p->>'unit',(p->>'packSize')::numeric,(p->>'packPrice')::bigint,true) returning * into product;
    else
      update cc_private.supplier_products set name=p->>'name',category=left(coalesce(p->>'category','Other'),100),pack_price=(p->>'packPrice')::bigint,
        available=(p->>'available')::boolean,version=version+1 where id=(p->>'id')::uuid and supplier_id=sid and version=(p->>'expectedVersion')::int returning * into product;
      if not found then raise exception 'Product changed. Refresh the catalog.'; end if;
    end if;
    return to_jsonb(product);
  elsif op='submit_quote' then
    select restaurant_id into po.restaurant_id from cc_private.purchases where id=(p->>'id')::uuid and supplier_id=sid;
    perform 1 from cc_private.restaurants where id=po.restaurant_id for update;
    select * into po from cc_private.purchases where id=(p->>'id')::uuid and supplier_id=sid for update;
    if exists(select 1 from cc_private.external_jobs where purchase_id=po.id and kind='supplier_purchase' and status in ('leased','uncertain','succeeded')) then raise exception 'The purchase is being sent or needs delivery reconciliation'; end if;
    if not found or po.status not in ('QUOTE_REQUESTED','QUOTED','APPROVED') or po.version is distinct from (p->>'expectedVersion')::int then raise exception 'Quote request is no longer current'; end if;
    if not exists(select 1 from cc_private.supplier_links where restaurant_id=po.restaurant_id and supplier_id=sid and status='approved') then raise exception 'Restaurant relationship is not approved'; end if;
    update cc_private.purchases set pack_price=(p->>'packPrice')::bigint,delivery_fee=(p->>'deliveryFee')::bigint,terms=left(coalesce(p->>'terms',''),1000),
      status='QUOTED',version=version+1,approved_version=null,approved_by=null,authority_source=null where id=po.id;
    update cc_private.external_jobs set status='cancelled',finished_at=now() where purchase_id=po.id and status='queued';
    perform cc_private.record(po.restaurant_id,'supplier.quote_received',po.id,'Supplier submitted revised terms. Owner approval required.');
    perform cc_private.evaluate(po.restaurant_id);
    return jsonb_build_object('id',po.id,'status','QUOTED','version',po.version+1);
  elsif op='accept_supplier_invite' then
    select * into invitation from cc_private.invites where token=(p->>'token')::uuid and role='supplier' and accepted_at is null and expires_at>now() for update;
    if not found or not exists(select 1 from auth.users where id=uid and lower(email)=lower(invitation.email)) then raise exception 'This invitation is expired or belongs to another verified email'; end if;
    insert into cc_private.supplier_links(restaurant_id,supplier_id,status) values(invitation.restaurant_id,sid,'pending') on conflict do nothing;
    update cc_private.invites set accepted_at=now() where id=invitation.id;
    perform cc_private.record(invitation.restaurant_id,'supplier.connection_requested',sid,'Supplier accepted invitation. Review the connection.');
    return jsonb_build_object('status','pending');
  end if;
  raise exception 'Unknown supplier command';
end $$;

create function cc_private.snapshot(r uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare cfg cc_private.restaurants; answer jsonb;
begin
  perform cc_private.require_access(r);
  select * into cfg from cc_private.restaurants where id=r;
  select jsonb_build_object(
    'restaurant',to_jsonb(cfg),
    'rules',coalesce((select jsonb_agg(to_jsonb(x)) from cc_private.reorder_rules x where restaurant_id=r),'[]'),
    'members',case when cc_private.can_access(cfg.business_id,true,true) then coalesce((select jsonb_agg(jsonb_build_object('userId',bm.user_id,'email',u.email,'role',bm.member_role,'status',bm.status)) from platform.business_memberships bm join auth.users u on u.id=bm.user_id where bm.business_id=cfg.business_id),'[]') else '[]'::jsonb end,
    'role',(select member_role from platform.business_memberships where business_id=cfg.business_id and user_id=auth.uid() and status='active'),
    'orders',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from
      (select o.id,o.status,o.origin,o.note,o.total,o.food_cost,o.created_at,o.prepared_at,o.completed_at,o.cancelled_at,o.cancellation_reason,s.label as station,
      (select jsonb_agg(jsonb_build_object('name',i.name,'quantity',i.quantity,'unitPrice',i.unit_price,'recipeVersion',i.recipe_version)) from cc_private.order_items i where i.order_id=o.id) as items
      from cc_private.orders o left join cc_private.stations s on s.id=o.station_id where o.restaurant_id=r
      and (o.status in ('NEW','ACCEPTED','PREPARING','READY') or (o.created_at at time zone cfg.timezone)::date=(now() at time zone cfg.timezone)::date) order by (o.status in ('NEW','ACCEPTED','PREPARING','READY')) desc,o.created_at desc limit 500) x),'[]'),
    'menu',coalesce((select jsonb_agg(to_jsonb(m) order by sort_order) from cc_private.menu_items m where restaurant_id=r),'[]'),
    'recipes',coalesce((select jsonb_agg(to_jsonb(l)) from cc_private.recipe_lines l join cc_private.menu_items m on m.id=l.menu_item_id and l.version=m.recipe_version where l.restaurant_id=r),'[]'),
    'ingredients',coalesce((select jsonb_agg(to_jsonb(i)||jsonb_build_object('incoming',coalesce((select sum(p.packs*p.pack_size-p.received) from cc_private.purchases p where p.ingredient_id=i.id and p.status in ('CONFIRMED','PARTIAL')),0)) order by i.name) from cc_private.ingredients i where restaurant_id=r),'[]'),
    'suppliers',coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('linkStatus',l.status)) from cc_private.suppliers s join cc_private.supplier_links l on l.supplier_id=s.id where l.restaurant_id=r),'[]'),
    'supplierProducts',coalesce((select jsonb_agg(to_jsonb(s)) from cc_private.supplier_products s join cc_private.supplier_links l on l.supplier_id=s.supplier_id where l.restaurant_id=r and l.status='approved'),'[]'),
    'purchases',coalesce((select jsonb_agg(to_jsonb(p) order by created_at desc) from cc_private.purchases p where restaurant_id=r),'[]'),
    'activity',coalesce((select jsonb_agg(to_jsonb(a)) from (select * from cc_private.activity where restaurant_id=r order by created_at desc,id desc limit 100) a),'[]'),
    'jobs',coalesce((select jsonb_agg(jsonb_build_object('id',j.id,'kind',j.kind,'status',case when j.status='leased' and j.lease_until<now() then 'uncertain' else j.status end,'created_at',j.created_at,'error_code',case when j.status='leased' and j.lease_until<now() then 'lease_expired' else j.error_code end,'provider_receipt',j.provider_receipt)) from cc_private.external_jobs j where restaurant_id=r),'[]'),
    'stations',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'label',s.label,'enabled',s.enabled,'token',case when cc_private.can_access(cfg.business_id,true,true) then s.token else null end) order by label) from cc_private.stations s where restaurant_id=r),'[]'),
    'daily',coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from (select (completed_at at time zone cfg.timezone)::date as day,origin,count(*) as orders,sum(total) as sales,sum(food_cost) as food_cost
      from cc_private.orders where restaurant_id=r and status='COMPLETED' and completed_at>now()-interval '100 days' group by 1,2) d),'[]'),
    'bestSellers',coalesce((select jsonb_agg(to_jsonb(d)) from (select i.name,sum(i.quantity) as quantity,sum(i.quantity*i.unit_price) as sales from cc_private.order_items i join cc_private.orders o on o.id=i.order_id where o.restaurant_id=r and o.status='COMPLETED' and o.completed_at>now()-interval '30 days' group by i.name order by quantity desc) d),'[]'),
    'movements',coalesce((select jsonb_agg(to_jsonb(m)) from(select * from cc_private.stock_movements where restaurant_id=r order by created_at desc limit 100) m),'[]')
  ) into answer;
  return answer;
end $$;
create policy cc_member_changes on public.cc_changes for select to authenticated using(cc_private.can_access(business_id));
grant select on public.cc_changes to authenticated;

create function cc_private.record(r uuid, kind text, record_id uuid, summary text, details jsonb default '{}')
returns void language plpgsql security definer set search_path='' as $$
begin
  insert into cc_private.activity(restaurant_id,actor_id,kind,record_id,summary,details) values(r,auth.uid(),kind,record_id,summary,details);
  insert into public.cc_changes(business_id) select business_id from cc_private.restaurants where id=r;
end $$;

-- Public read: only the published menu. No supplier, cost, stock, staff or customer fields.
create function cc_private.menu(slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',r.id,'name',r.name,'slug',r.slug,'demo',r.demo,'acceptingOrders',r.accepting_orders,'items',
   coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'code',m.code,'name',m.name,'category',m.category,'description',m.description,
   'image',m.image,'price',m.price,'available',m.available,'allergens',m.allergens) order by m.sort_order) from cc_private.menu_items m where m.restaurant_id=r.id),'[]'))
 from cc_private.restaurants r where r.slug=menu.slug
$$;

-- QR station is a limited bearer capability: creating an unaccepted order is its only write authority.
-- Serialize station submissions and enforce a DB limit, including callers bypassing the website.
create function cc_private.place_order(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s cc_private.stations; r cc_private.restaurants; o cc_private.orders; m cc_private.menu_items;
  line jsonb; n integer; order_total bigint:=0; fingerprint jsonb; item_count integer:=0;
begin
  select * into s from cc_private.stations where token=(p->>'stationToken')::uuid and enabled for update;
  if not found then raise exception 'This table is not accepting orders. Please ask the restaurant team.'; end if;
  select * into r from cc_private.restaurants where id=s.restaurant_id;
  fingerprint:=jsonb_build_object('items',p->'items','note',coalesce(p->>'note',''),'station',s.id);
  select * into o from cc_private.orders where restaurant_id=r.id and request_key=(p->>'requestKey')::uuid;
  if found then
    if o.request_fingerprint<>fingerprint then raise exception 'Request key was already used for a different order'; end if;
    return jsonb_build_object('id',o.id,'receiptToken',o.receipt_token,'status',o.status,'total',o.total);
  end if;
  if not r.accepting_orders then raise exception 'Online ordering is paused. Your order has not been placed.'; end if;
  if (select count(*) from cc_private.orders where station_id=s.id and created_at>now()-interval '5 minutes' and origin='customer')>=10 then
    raise exception 'This table has received several orders. Please ask a team member before sending another.';
  end if;
  if jsonb_typeof(p->'items')<>'array' or jsonb_array_length(p->'items') not between 1 and 12 then raise exception 'Choose between 1 and 12 dishes'; end if;
  if length(coalesce(p->>'note',''))>500 then raise exception 'Please shorten the order note'; end if;
  if exists(select 1 from jsonb_array_elements(p->'items') x group by x->>'id' having count(*)>1) then raise exception 'Duplicate dishes are not allowed'; end if;
  insert into cc_private.orders(restaurant_id,station_id,request_key,request_fingerprint,origin,note)
    values(r.id,s.id,(p->>'requestKey')::uuid,fingerprint,'customer',coalesce(p->>'note','')) returning * into o;
  for line in select value from jsonb_array_elements(p->'items') loop
    n:=(line->>'quantity')::integer;
    if n is null or n not between 1 and 20 then raise exception 'Invalid quantity'; end if;
    item_count:=item_count+n;
    select * into m from cc_private.menu_items where id=(line->>'id')::uuid and restaurant_id=r.id and available for share;
    if not found then raise exception 'A selected dish is unavailable. Refresh your menu before ordering.'; end if;
    if (line->>'price')::bigint is distinct from m.price then raise exception 'A price changed. Review your menu before ordering.'; end if;
    insert into cc_private.order_items(restaurant_id,order_id,menu_item_id,name,unit_price,quantity) values(r.id,o.id,m.id,m.name,m.price,n);
    order_total:=order_total+m.price*n;
  end loop;
  if item_count>40 then raise exception 'For larger orders, please speak with the restaurant team'; end if;
  update cc_private.orders set total=order_total where id=o.id;
  perform cc_private.record(r.id,'order.created',o.id,'New customer order received');
  return jsonb_build_object('id',o.id,'receiptToken',o.receipt_token,'status',o.status,'total',order_total);
end $$;

create function cc_private.order_status(p jsonb) returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',o.id,'status',o.status,'total',o.total,'createdAt',o.created_at,'note',o.note,
  'items',(select jsonb_agg(jsonb_build_object('name',i.name,'quantity',i.quantity,'unitPrice',i.unit_price)) from cc_private.order_items i where i.order_id=o.id))
  from cc_private.orders o where o.id=(p->>'id')::uuid and o.receipt_token=(p->>'receiptToken')::uuid
$$;

create function cc_private.transition_order(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare o cc_private.orders; u record; next_status text:=p->>'status'; cost bigint; r uuid:=(p->>'restaurantId')::uuid;
begin
  perform cc_private.require_access(r,true);
  -- A restaurant row lock gives stock, recipe and order commands one consistent lock order.
  perform 1 from cc_private.restaurants where id=r for update;
  select * into o from cc_private.orders where id=(p->>'id')::uuid and restaurant_id=r for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status=next_status then return jsonb_build_object('id',o.id,'status',o.status); end if;
  if not ((o.status='NEW' and next_status in ('ACCEPTED','CANCELLED')) or (o.status='ACCEPTED' and next_status in ('PREPARING','CANCELLED'))
    or(o.status='PREPARING' and next_status in ('READY','CANCELLED')) or(o.status='READY' and next_status in ('COMPLETED','CANCELLED'))) then raise exception 'Order changed. Refresh before continuing.'; end if;
  if p->>'expectedStatus' is distinct from o.status then raise exception 'Order changed. Refresh before continuing.'; end if;
  if next_status='ACCEPTED' then
    if exists(select 1 from cc_private.order_items i join cc_private.menu_items m on m.id=i.menu_item_id where i.order_id=o.id and
      (not m.available or not exists(select 1 from cc_private.recipe_lines l where l.menu_item_id=m.id and l.version=m.recipe_version))) then raise exception 'A dish is unavailable or its recipe is incomplete'; end if;
    update cc_private.order_items i set recipe_version=m.recipe_version from cc_private.menu_items m where i.order_id=o.id and i.menu_item_id=m.id;
    insert into cc_private.order_usage(restaurant_id,order_id,ingredient_id,quantity,unit_cost)
      select r,o.id,l.ingredient_id,sum(l.quantity*i.quantity),g.average_cost from cc_private.order_items i
      join cc_private.recipe_lines l on l.menu_item_id=i.menu_item_id and l.version=i.recipe_version
      join cc_private.ingredients g on g.id=l.ingredient_id where i.order_id=o.id group by l.ingredient_id,g.average_cost;
    for u in select * from cc_private.order_usage where order_id=o.id order by ingredient_id loop
      update cc_private.ingredients set reserved=reserved+u.quantity where id=u.ingredient_id and on_hand-reserved>=u.quantity;
      if not found then raise exception 'Not enough available ingredients. Review inventory before accepting.'; end if;
    end loop;
    update cc_private.orders set accepted_at=now() where id=o.id;
  elsif next_status='PREPARING' then
    for u in select * from cc_private.order_usage where order_id=o.id order by ingredient_id loop
      -- Refresh cost at actual usage, retaining the recipe quantities pinned at acceptance.
      update cc_private.order_usage set unit_cost=(select average_cost from cc_private.ingredients where id=u.ingredient_id) where order_id=o.id and ingredient_id=u.ingredient_id;
      update cc_private.ingredients set on_hand=on_hand-u.quantity,reserved=reserved-u.quantity where id=u.ingredient_id;
      insert into cc_private.stock_movements(restaurant_id,ingredient_id,kind,quantity,unit_cost,reference,reason,actor_id)
        select r,u.ingredient_id,'usage',-u.quantity,unit_cost,o.id::text,'Preparation started',auth.uid() from cc_private.order_usage where order_id=o.id and ingredient_id=u.ingredient_id;
    end loop;
    select round(sum(quantity*unit_cost)) into cost from cc_private.order_usage where order_id=o.id;
    update cc_private.orders set prepared_at=now(),food_cost=coalesce(cost,0) where id=o.id;
  elsif next_status='COMPLETED' then
    update cc_private.orders set completed_at=now() where id=o.id;
  elsif next_status='CANCELLED' then
    if length(trim(coalesce(p->>'reason',''))) not between 3 and 300 then raise exception 'Add a cancellation reason'; end if;
    if o.status='ACCEPTED' then
      for u in select * from cc_private.order_usage where order_id=o.id order by ingredient_id loop
        update cc_private.ingredients set reserved=reserved-u.quantity where id=u.ingredient_id;
      end loop;
    elsif o.prepared_at is not null then
      insert into cc_private.stock_movements(restaurant_id,ingredient_id,kind,quantity,unit_cost,reference,reason,actor_id)
        select r,ingredient_id,'cancelled_prepared',0,unit_cost,o.id::text,p->>'reason',auth.uid() from cc_private.order_usage where order_id=o.id;
    end if;
    update cc_private.orders set cancelled_at=now(),cancellation_reason=p->>'reason' where id=o.id;
  end if;
  update cc_private.orders set status=next_status where id=o.id;
  perform cc_private.record(r,'order.'||lower(next_status),o.id,'Order '||lower(next_status),jsonb_build_object('previous',o.status,'reason',p->>'reason'));
  perform cc_private.evaluate(r);
  return jsonb_build_object('id',o.id,'status',next_status);
end $$;

create function cc_private.api(op text,p jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare r uuid; uid uuid; data jsonb; m cc_private.menu_items; g cc_private.ingredients; line jsonb; v int; invitation cc_private.invites; job cc_private.external_jobs;
begin
  if octet_length(p::text)>16384 then raise exception 'Request is too large'; end if;
  if op='menu' then return cc_private.menu(p->>'slug'); end if;
  if op='place_order' then return cc_private.place_order(p); end if;
  if op='order_status' then return cc_private.order_status(p); end if;
  -- Callback authority is limited to one previously leased job and its short-lived random token.
  if op='begin_action' then
    update cc_private.external_jobs set dispatch_started_at=now() where id=(p->>'id')::uuid and lease_token=(p->>'leaseToken')::uuid and status='leased' and lease_until>now() and dispatch_started_at is null returning * into job;
    if not found then raise exception 'Action is expired or already dispatched' using errcode='42501'; end if;
    return jsonb_build_object('id',job.id,'kind',job.kind,'recipient',(select s.contact_email from cc_private.suppliers s join cc_private.purchases po on po.supplier_id=s.id where po.id=job.purchase_id),'purchase',(select jsonb_build_object('id',po.id,'packs',po.packs,'packSize',po.pack_size,'packPrice',po.pack_price,'deliveryFee',po.delivery_fee,'terms',po.terms,'product',sp.name) from cc_private.purchases po join cc_private.supplier_products sp on sp.id=po.product_id where po.id=job.purchase_id));
  end if;
  if op='job_result' then
    select * into job from cc_private.external_jobs where id=(p->>'id')::uuid and lease_token=(p->>'leaseToken')::uuid for update;
    if not found or job.lease_until<now() then raise exception 'Invalid or expired action receipt' using errcode='42501'; end if;
    if job.status in ('succeeded','failed','uncertain') then return jsonb_build_object('status',job.status); end if;
    if job.status<>'leased' or p->>'status' not in ('succeeded','failed','uncertain') then raise exception 'Invalid action result'; end if;
    if p->>'status'='succeeded' and length(coalesce(p->>'providerReceipt','')) not between 1 and 300 then raise exception 'A provider receipt is required'; end if;
    update cc_private.external_jobs set status=p->>'status',provider_receipt=left(p->>'providerReceipt',300),error_code=left(p->>'errorCode',80),finished_at=now() where id=job.id;
    insert into cc_private.external_attempts(job_id,lease_token,status,provider_receipt) values(job.id,job.lease_token,p->>'status',left(p->>'providerReceipt',300));
    perform cc_private.record(job.restaurant_id,'integration.result',job.id,'Supplier communication '||(p->>'status'));
    return jsonb_build_object('status',p->>'status');
  end if;
  uid:=cc_private.verified_user();
  if uid is null then raise exception 'Sign in with a verified account' using errcode='42501'; end if;
  if op='my_businesses' then
    -- Initial owner invitation is provisioned administratively, then claimed only by its verified email.
    for invitation in select i.* from cc_private.invites i join auth.users u on lower(u.email)=lower(i.email) where u.id=uid and i.role='owner' and i.invited_by is null and i.accepted_at is null and i.expires_at>now() for update of i loop
      if not exists(select 1 from platform.business_memberships bm join cc_private.restaurants x on x.business_id=bm.business_id where x.id=invitation.restaurant_id and bm.member_role='owner' and bm.status='active') then
        insert into platform.business_memberships(business_id,user_id,member_role,status) select business_id,uid,'owner','active' from cc_private.restaurants where id=invitation.restaurant_id on conflict(business_id,user_id) do update set member_role='owner',status='active';
        update cc_private.invites set accepted_at=now() where id=invitation.id;
        perform cc_private.record(invitation.restaurant_id,'membership.owner_verified',uid,'Initial owner verified email and accepted access');
      end if;
    end loop;
    return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'businessId',r.business_id,'name',r.name,'slug',r.slug,'role',b.member_role))
      from cc_private.restaurants r join platform.business_memberships b on b.business_id=r.business_id where b.user_id=uid and b.status='active'),'[]');
  end if;
  if op='accept_invite' then
    select * into invitation from cc_private.invites where token=(p->>'token')::uuid and role<>'supplier' and expires_at>now() and accepted_at is null for update;
    if not found or not exists(select 1 from auth.users where id=uid and lower(email)=lower(invitation.email)) then raise exception 'This invitation is expired or belongs to another verified account'; end if;
    insert into platform.business_memberships(business_id,user_id,member_role,status) select business_id,uid,invitation.role,'active' from cc_private.restaurants where id=invitation.restaurant_id
      on conflict(business_id,user_id) do update set status='active',member_role=excluded.member_role;
    update cc_private.invites set accepted_at=now() where id=invitation.id;
    perform cc_private.record(invitation.restaurant_id,'membership.accepted',uid,'Verified member accepted invitation');
    return jsonb_build_object('restaurantId',invitation.restaurant_id);
  end if;
  if op in ('register_supplier','save_supplier_product','submit_quote','accept_supplier_invite') then return cc_private.supplier_command(op,p); end if;
  if op='supplier_snapshot' then
    return jsonb_build_object('suppliers',coalesce((select jsonb_agg(to_jsonb(s)) from cc_private.suppliers s join cc_private.supplier_members member on member.supplier_id=s.id where member.user_id=uid),'[]'),
      'products',coalesce((select jsonb_agg(to_jsonb(s)) from cc_private.supplier_products s join cc_private.supplier_members member on member.supplier_id=s.supplier_id where member.user_id=uid),'[]'),
      'requests',coalesce((select jsonb_agg(jsonb_build_object('id',po.id,'restaurant',r.name,'supplier_id',po.supplier_id,'product_id',po.product_id,'packs',po.packs,'pack_size',po.pack_size,'pack_price',po.pack_price,'delivery_fee',po.delivery_fee,'status',po.status,'version',po.version,'terms',po.terms))
        from cc_private.purchases po join cc_private.supplier_members member on member.supplier_id=po.supplier_id join cc_private.restaurants r on r.id=po.restaurant_id
        join cc_private.supplier_links l on l.restaurant_id=po.restaurant_id and l.supplier_id=po.supplier_id and l.status='approved'
        where member.user_id=uid and po.status not in ('DRAFT','CANCELLED')),'[]'));
  end if;
  r:=(p->>'restaurantId')::uuid;
  if op='snapshot' then return cc_private.snapshot(r); end if;
  if op='transition_order' then return cc_private.transition_order(p); end if;
  if op in ('create_purchase','request_quote','approve_purchase','confirm_purchase','receive_purchase','cancel_purchase','queue_supplier_contact') then return cc_private.purchase_command(op,p); end if;
  perform cc_private.require_access(r,true,op in ('configure','set_ordering','create_invite','approve_supplier','update_member','claim_job','save_rule','evaluate','reconcile_job','retry_action'));
  perform 1 from cc_private.restaurants where id=r for update;
  if op='update_member' then
    if not exists(select 1 from platform.business_memberships b join cc_private.restaurants x on x.business_id=b.business_id where x.id=r and b.user_id=uid and b.member_role='owner' and b.status='active') then raise exception 'Only the owner can change membership' using errcode='42501'; end if;
    if (p->>'userId')::uuid=uid or p->>'role' not in ('admin','editor','viewer') or p->>'status' not in ('active','disabled') then raise exception 'Choose a staff role and status. Your own owner access cannot be removed here.'; end if;
    update platform.business_memberships set member_role=p->>'role',status=p->>'status' where business_id=(select business_id from cc_private.restaurants where id=r) and user_id=(p->>'userId')::uuid and member_role<>'owner';
    if not found then raise exception 'Staff membership not found'; end if;
    perform cc_private.record(r,'membership.changed',(p->>'userId')::uuid,'Staff access changed');
  elsif op='configure' then
    if p->>'mode' in ('contact','buy') and not exists(select 1 from cc_private.restaurants where id=r and integrations_ready) then raise exception 'Connect and verify supplier messaging before enabling external automation'; end if;
    update cc_private.restaurants set jourvis_mode=p->>'mode',per_order_limit=(p->>'perOrderLimit')::bigint,daily_limit=(p->>'dailyLimit')::bigint where id=r;
    perform cc_private.record(r,'jourvis.mode_changed',r,'Jourvis is now '||(p->>'mode'));
  elsif op='set_ordering' then
    update cc_private.restaurants set accepting_orders=(p->>'enabled')::boolean where id=r;
    update cc_private.stations set enabled=(p->>'enabled')::boolean where restaurant_id=r;
    perform cc_private.record(r,'ordering.changed',r,case when (p->>'enabled')::boolean then 'QR ordering opened' else 'QR ordering paused' end);
  elsif op='save_menu' then
    select * into m from cc_private.menu_items where id=(p->>'id')::uuid and restaurant_id=r for update;
    if not found then raise exception 'Menu item not found'; end if;
    update cc_private.menu_items set price=(p->>'price')::bigint,available=(p->>'available')::boolean where id=m.id;
    perform cc_private.record(r,'menu.updated',m.id,'Price or availability updated for '||m.name);
  elsif op='save_recipe' then
    select * into m from cc_private.menu_items where id=(p->>'id')::uuid and restaurant_id=r for update;
    if not found or m.recipe_version is distinct from (p->>'expectedVersion')::int then raise exception 'Recipe changed. Refresh before editing.'; end if;
    if jsonb_typeof(p->'lines')<>'array' or jsonb_array_length(p->'lines') not between 1 and 40 then raise exception 'A recipe needs between 1 and 40 ingredients'; end if;
    v:=m.recipe_version+1;
    for line in select value from jsonb_array_elements(p->'lines') loop
      insert into cc_private.recipe_lines(restaurant_id,menu_item_id,version,ingredient_id,quantity) values(r,m.id,v,(line->>'ingredientId')::uuid,(line->>'quantity')::numeric);
    end loop;
    update cc_private.menu_items set recipe_version=v where id=m.id;
    perform cc_private.record(r,'recipe.version_created',m.id,'New recipe version saved. Accepted orders retain their original recipe.',jsonb_build_object('version',v));
  elsif op='adjust_stock' then
    select * into g from cc_private.ingredients where id=(p->>'id')::uuid and restaurant_id=r for update;
    if not found then raise exception 'Ingredient not found'; end if;
    if exists(select 1 from cc_private.activity where restaurant_id=r and kind='stock.adjusted' and details->>'requestKey'=p->>'requestKey') then
      if not exists(select 1 from cc_private.activity where restaurant_id=r and kind='stock.adjusted' and record_id=g.id and details->>'requestKey'=p->>'requestKey' and details->>'kind'=p->>'kind' and (details->>'quantity')::numeric=(p->>'quantity')::numeric and details->>'reason'=p->>'reason') then raise exception 'Request key already used for a different adjustment'; end if;
      return jsonb_build_object('saved',true);
    end if;
    perform (p->>'requestKey')::uuid;
    if p->>'requestKey' is null then raise exception 'An adjustment request key is required'; end if;
    if p->>'kind'='count' and (p->>'expectedOnHand')::numeric is distinct from g.on_hand then raise exception 'Stock changed. Refresh before recording a physical count'; end if;
    if length(trim(coalesce(p->>'reason',''))) not between 3 and 300 then raise exception 'Explain this stock adjustment'; end if;
    if p->>'kind'='waste' then
      if (p->>'quantity')::numeric<=0 or (p->>'quantity')::numeric>g.on_hand-g.reserved then raise exception 'Waste must be within available stock'; end if;
      update cc_private.ingredients set on_hand=on_hand-(p->>'quantity')::numeric where id=g.id;
      insert into cc_private.stock_movements(restaurant_id,ingredient_id,kind,quantity,unit_cost,reference,reason,actor_id) values(r,g.id,'waste',-(p->>'quantity')::numeric,g.average_cost,p->>'requestKey',p->>'reason',uid);
    elsif p->>'kind'='count' then
      if (p->>'quantity')::numeric<g.reserved then raise exception 'Count is below reserved stock. Resolve affected accepted orders before adjusting.'; end if;
      update cc_private.ingredients set on_hand=(p->>'quantity')::numeric where id=g.id;
      insert into cc_private.stock_movements(restaurant_id,ingredient_id,kind,quantity,unit_cost,reference,reason,actor_id) values(r,g.id,'count',(p->>'quantity')::numeric-g.on_hand,g.average_cost,p->>'requestKey',p->>'reason',uid);
    else raise exception 'Choose a physical count or waste'; end if;
    perform cc_private.record(r,'stock.adjusted',g.id,'Stock adjustment: '||g.name,jsonb_build_object('kind',p->>'kind','reason',p->>'reason','quantity',p->>'quantity','requestKey',p->>'requestKey'));
  elsif op='create_invite' then
    if p->>'role'='owner' and not exists(select 1 from platform.business_memberships bm join cc_private.restaurants x on x.business_id=bm.business_id where x.id=r and bm.user_id=uid and bm.status='active' and bm.member_role='owner') then raise exception 'Only an owner may invite another owner' using errcode='42501'; end if;
    if p->>'email' !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Enter a valid email address'; end if;
    insert into cc_private.invites(restaurant_id,email,role,invited_by) values(r,lower(p->>'email'),p->>'role',uid) returning * into invitation;
    perform cc_private.record(r,'invitation.created',invitation.id,'Invitation prepared for a verified email');
    return jsonb_build_object('token',invitation.token,'role',invitation.role,'expiresAt',invitation.expires_at);
  elsif op='approve_supplier' then
    update cc_private.supplier_links set status='approved' where restaurant_id=r and supplier_id=(p->>'supplierId')::uuid and status='pending';
    if not found then raise exception 'Pending supplier connection not found'; end if;
    perform cc_private.record(r,'supplier.approved',(p->>'supplierId')::uuid,'Supplier relationship approved');
  elsif op='reconcile_job' then
    select * into job from cc_private.external_jobs where restaurant_id=r and id=(p->>'id')::uuid for update;
    if not found or (job.status not in ('uncertain','failed') and not(job.status='leased' and job.lease_until<now())) then raise exception 'Only an uncertain or failed action can be reconciled'; end if;
    if length(trim(coalesce(p->>'reference',''))) not between 5 and 300 or p->>'outcome' not in ('sent','not_sent') then raise exception 'Record the independently verified outcome and supporting reference'; end if;
    update cc_private.external_jobs set status=case when p->>'outcome'='sent' then 'succeeded' else 'failed' end,provider_receipt=case when p->>'outcome'='sent' then p->>'reference' else null end,error_code=case when p->>'outcome'='not_sent' then 'owner_verified_not_sent' else null end,finished_at=now() where id=job.id;
    perform cc_private.record(r,'integration.reconciled',job.id,'Owner verified external delivery outcome',jsonb_build_object('outcome',p->>'outcome','reference',p->>'reference'));
  elsif op='retry_action' then
    select * into job from cc_private.external_jobs where restaurant_id=r and id=(p->>'id')::uuid and status='failed' and error_code in ('owner_verified_not_sent','gateway_auth_rejected','action_rejected_before_send') for update;
    if not found then raise exception 'Verify that no message was sent before authorizing a new attempt'; end if;
    if not exists(select 1 from cc_private.external_jobs where idempotency_key=job.id::text||':owner-retry') then
      insert into cc_private.external_jobs(restaurant_id,purchase_id,kind,idempotency_key,payload) values(r,job.purchase_id,job.kind,job.id::text||':owner-retry',job.payload);
      perform cc_private.record(r,'integration.retry_authorized',job.id,'Owner authorized one new external attempt');
    end if;
  elsif op='claim_job' then
    return cc_private.claim_job(r);
  elsif op='save_rule' then
    return cc_private.save_rule(r,p);
  elsif op='evaluate' then
    perform cc_private.evaluate(r);
  else raise exception 'Unknown command'; end if;
  perform cc_private.evaluate(r);
  return jsonb_build_object('saved',true);
end $$;

create function public.cc_api(op text,p jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$
  select cc_private.api(op,p)
$$;
revoke all on all functions in schema cc_private from public,anon,authenticated;
grant usage on schema cc_private to anon,authenticated;
grant execute on function cc_private.worker(text,text,jsonb) to anon,authenticated;
grant execute on function cc_private.api(text,jsonb) to anon,authenticated;
grant execute on function cc_private.can_access(uuid,boolean,boolean) to authenticated;
revoke all on function public.cc_api(text,jsonb) from public;
grant execute on function public.cc_api(text,jsonb) to anon,authenticated;

-- RLS is defense in depth on all private tables; writes are possible only through checked commands.
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname='cc_private' loop
    execute format('alter table cc_private.%I enable row level security',t.tablename);
  end loop;
end $$;

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.cc_changes;
  end if;
end $$;
