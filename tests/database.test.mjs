import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { seedSql } from "../scripts/seed-demo.mjs";
import { createHash } from "node:crypto";
let db;
let restaurant, station, menu, owner, outsider, viewer;
async function api(op, p = {}) {
  return (await db.query("select public.cc_api($1,$2::jsonb) as result", [op, JSON.stringify(p)]))
    .rows[0].result;
}
async function signIn(id) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || ""]);
}
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema platform;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table platform.businesses(id uuid primary key default gen_random_uuid(),business_key text unique,display_name text,status text default 'draft',timezone text default 'UTC',locale text default 'en',metadata jsonb default '{}');
    create table platform.business_memberships(id uuid primary key default gen_random_uuid(),business_id uuid references platform.businesses(id),user_id uuid references auth.users(id),member_role text,status text,unique(business_id,user_id));
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  for (const file of readdirSync("supabase/migrations")
    .filter((x) => x.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  try {
    await db.exec(seedSql(today));
  } catch (e) {
    throw new Error(`${e.message}: ${e.where}`);
  }
  restaurant = (await db.query("select * from cc_private.restaurants")).rows[0];
  station = (await db.query("select * from cc_private.stations order by label")).rows[0];
  menu = (await db.query("select * from cc_private.menu_items order by sort_order")).rows;
  [owner, outsider, viewer] = (
    await db.query(
      `insert into auth.users(id,email,email_confirmed_at) values(gen_random_uuid(),'owner@example.invalid',now()),(gen_random_uuid(),'outsider@example.invalid',now()),(gen_random_uuid(),'viewer@example.invalid',now()) returning id`,
    )
  ).rows.map((x) => x.id);
  await db.query(
    `insert into platform.business_memberships(business_id,user_id,member_role,status) values($1,$2,'owner','active'),($1,$3,'viewer','active')`,
    [restaurant.business_id, owner, viewer],
  );
});
after(async () => db?.close());

test("auth mail capability is scoped, exact-envelope, one-time and contains no email payload", async () => {
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  const token = "local-test-only-".repeat(4),
    id = hash("webhook-1");
  const messageJson = JSON.stringify({
    to: "owner@example.invalid",
    subject: "Verify",
    message: "Synthetic code",
  });
  const mail = async (op, p, t = token) =>
    (
      await db.query("select public.cc_auth_mail($1,$2,$3::jsonb) as result", [
        t,
        op,
        JSON.stringify(p),
      ])
    ).rows[0].result;
  await db.query("insert into cc_private.auth_mail_grant(token_hash,enabled) values($1,true)", [
    hash(token),
  ]);
  await assert.rejects(mail("claim", { id, digest: hash(messageJson) }, "incorrect"), /denied/);
  await assert.rejects(mail("claim", { id, digest: hash(messageJson) }, null), /denied/);
  const claim = await mail("claim", { id, digest: hash(messageJson) });
  assert.equal(claim.state, "claimed");
  assert.equal((await mail("claim", { id, digest: hash(messageJson) })).state, "uncertain");
  await assert.rejects(
    mail("begin", { id, lease: claim.lease, messageJson: "tampered" }, ""),
    /denied/,
  );
  await assert.rejects(mail("finish", { id, lease: claim.lease }), /denied/);
  assert.equal((await mail("begin", { id, lease: claim.lease, messageJson }, "")).state, "sending");
  await assert.rejects(mail("begin", { id, lease: claim.lease, messageJson }, ""), /denied/);
  await assert.rejects(mail("finish", { id, lease: crypto.randomUUID() }), /denied/);
  assert.equal((await mail("finish", { id, lease: claim.lease })).state, "sent");
  assert.equal((await mail("claim", { id, digest: hash(messageJson) })).state, "sent");
  await assert.rejects(mail("claim", { id, digest: hash("different") }), /mismatch/);
  const next = hash("expired"),
    nextClaim = await mail("claim", { id: next, digest: hash(messageJson) });
  await db.query(
    "update cc_private.auth_mail_deliveries set created_at=now()-interval '1 minute' where id=$1",
    [next],
  );
  await assert.rejects(
    mail("begin", { id: next, lease: nextClaim.lease, messageJson }, ""),
    /denied/,
  );
  const rows = (await db.query("select * from cc_private.auth_mail_deliveries")).rows;
  assert.ok(!JSON.stringify(rows).includes("owner@example.invalid"));
  assert.ok(!JSON.stringify(rows).includes(claim.lease));
  assert.equal(
    (
      await db.query(
        "select has_table_privilege('anon','cc_private.auth_mail_deliveries','select') as allowed",
      )
    ).rows[0].allowed,
    false,
  );
  await db.query("update cc_private.auth_mail_grant set enabled=false");
  await assert.rejects(
    mail("claim", { id: hash("disabled"), digest: hash(messageJson) }),
    /denied/,
  );
});
test("schema applies with no private table grants and public RPC only", async () => {
  const { rows } = await db.query(
    `select has_table_privilege('anon','cc_private.orders','select') as anon_read,has_table_privilege('authenticated','cc_private.orders','insert') as direct_write,has_function_privilege('anon','cc_private.transition_order(jsonb)','execute') as direct_command`,
  );
  assert.deepEqual(rows[0], { anon_read: false, direct_write: false, direct_command: false });
});
test("anonymous callers cannot access owner or supplier data", async () => {
  await signIn(null);
  for (const op of ["snapshot", "my_businesses", "supplier_snapshot", "configure", "claim_job"]) {
    await assert.rejects(db.query(`select public.cc_api($1,'{}')`, [op]), /Sign in/);
  }
});
test("canonical seed is 12 items, complete recipes, asleep, balanced stock and separate incoming", async () => {
  assert.equal(menu.length, 12);
  assert.equal(restaurant.jourvis_mode, "sleeping");
  assert.equal(restaurant.accepting_orders, false);
  const mismatches = (
    await db.query(
      `select g.code from cc_private.ingredients g left join cc_private.stock_movements m on m.ingredient_id=g.id group by g.id,g.code having g.on_hand<>sum(m.quantity)`,
    )
  ).rows;
  assert.deepEqual(mismatches, []);
  const { rows } = await db.query(
    `select i.id from cc_private.menu_items i where not exists(select 1 from cc_private.recipe_lines l where l.menu_item_id=i.id and l.version=i.recipe_version)`,
  );
  assert.equal(rows.length, 0);
  await signIn(owner);
  const snap = await api("snapshot", { restaurantId: restaurant.id });
  assert.equal(Number(snap.ingredients.find((x) => x.code === "tomato").incoming), 12);
  assert.equal(Number(snap.ingredients.find((x) => x.code === "basil").incoming), 0);
  assert.equal(Number(snap.ingredients.find((x) => x.code === "shrimp").incoming), 0);
  assert.equal(
    snap.orders.filter((x) => x.origin === "seed" && x.status === "COMPLETED").length,
    20,
  );
  assert.equal(snap.daily.length, 91);
});
test("business membership, viewer access and revocation are enforced on every request", async () => {
  await signIn(owner);
  assert.equal((await api("my_businesses"))[0].id, restaurant.id);
  await signIn(outsider);
  await assert.rejects(api("snapshot", { restaurantId: restaurant.id }), /Access denied/);
  await signIn(viewer);
  assert.equal((await api("snapshot", { restaurantId: restaurant.id })).role, "viewer");
  await assert.rejects(
    api("set_ordering", { restaurantId: restaurant.id, enabled: true }),
    /Access denied/,
  );
  await db.query(`update platform.business_memberships set status='disabled' where user_id=$1`, [
    viewer,
  ]);
  await assert.rejects(api("snapshot", { restaurantId: restaurant.id }), /Access denied/);
});
async function newOrder(index = 8) {
  await signIn(owner);
  await api("set_ordering", { restaurantId: restaurant.id, enabled: true });
  await signIn(null);
  const o = await api("place_order", {
    stationToken: station.token,
    requestKey: crypto.randomUUID(),
    items: [{ id: menu[index].id, quantity: 1, price: menu[index].price }],
  });
  await signIn(owner);
  return o;
}
test("cancellation releases reservations before preparation and retains usage afterward", async () => {
  const order = await newOrder();
  await api("transition_order", {
    restaurantId: restaurant.id,
    id: order.id,
    status: "ACCEPTED",
    expectedStatus: "NEW",
  });
  const usage = (
    await db.query("select * from cc_private.order_usage where order_id=$1", [order.id])
  ).rows;
  await api("transition_order", {
    restaurantId: restaurant.id,
    id: order.id,
    status: "CANCELLED",
    expectedStatus: "ACCEPTED",
    reason: "Guest changed plans",
  });
  assert.equal(
    (
      await db.query("select count(*) n from cc_private.stock_movements where reference=$1", [
        order.id,
      ])
    ).rows[0].n,
    0,
  );
  const prepared = await newOrder();
  for (const [status, expectedStatus] of [
    ["ACCEPTED", "NEW"],
    ["PREPARING", "ACCEPTED"],
  ])
    await api("transition_order", {
      restaurantId: restaurant.id,
      id: prepared.id,
      status,
      expectedStatus,
    });
  const before = (await db.query("select sum(on_hand) n from cc_private.ingredients")).rows[0].n;
  await api("transition_order", {
    restaurantId: restaurant.id,
    id: prepared.id,
    status: "CANCELLED",
    expectedStatus: "PREPARING",
    reason: "Prepared dish not served",
  });
  assert.equal(
    (await db.query("select sum(on_hand) n from cc_private.ingredients")).rows[0].n,
    before,
  );
  assert.equal(
    (
      await db.query(
        "select count(*) n from cc_private.stock_movements where reference=$1 and kind='cancelled_prepared'",
        [prepared.id],
      )
    ).rows[0].n,
    usage.length,
  );
});
test("recipe edits preserve accepted snapshots and insufficient stock rolls back the whole acceptance", async () => {
  const order = await newOrder(0);
  await api("transition_order", {
    restaurantId: restaurant.id,
    id: order.id,
    status: "ACCEPTED",
    expectedStatus: "NEW",
  });
  const current = (
    await db.query("select * from cc_private.recipe_lines where menu_item_id=$1 and version=1", [
      menu[0].id,
    ])
  ).rows;
  await api("save_recipe", {
    restaurantId: restaurant.id,
    id: menu[0].id,
    expectedVersion: 1,
    lines: current.map((l) => ({
      ingredientId: l.ingredient_id,
      quantity: Number(l.quantity) * 10000,
    })),
  });
  assert.equal(
    (
      await db.query("select recipe_version from cc_private.order_items where order_id=$1", [
        order.id,
      ])
    ).rows[0].recipe_version,
    1,
  );
  const noStock = await newOrder(0);
  await assert.rejects(
    api("transition_order", {
      restaurantId: restaurant.id,
      id: noStock.id,
      status: "ACCEPTED",
      expectedStatus: "NEW",
    }),
    /Not enough/,
  );
  assert.equal(
    (
      await db.query("select count(*) n from cc_private.order_usage where order_id=$1", [
        noStock.id,
      ])
    ).rows[0].n,
    0,
  );
  await api("save_recipe", {
    restaurantId: restaurant.id,
    id: menu[0].id,
    expectedVersion: 2,
    lines: current.map((l) => ({ ingredientId: l.ingredient_id, quantity: Number(l.quantity) })),
  });
  await api("transition_order", {
    restaurantId: restaurant.id,
    id: order.id,
    status: "CANCELLED",
    expectedStatus: "ACCEPTED",
    reason: "End recipe test",
  });
});
test("purchase confirmation, partial receiving and retries preserve stock and incoming", async () => {
  await signIn(owner);
  const po = (await db.query("select * from cc_private.purchases where status='CONFIRMED'"))
    .rows[0];
  const ingredient = (
    await db.query("select * from cc_private.ingredients where id=$1", [po.ingredient_id])
  ).rows[0];
  const p = {
    restaurantId: restaurant.id,
    id: po.id,
    requestKey: crypto.randomUUID(),
    quantity: 4,
    reference: "TEST receipt",
  };
  await api("receive_purchase", p);
  await api("receive_purchase", p);
  const stock = (
    await db.query("select * from cc_private.ingredients where id=$1", [po.ingredient_id])
  ).rows[0];
  assert.equal(Number(stock.on_hand), Number(ingredient.on_hand) + 4);
  const purchase = (await db.query("select * from cc_private.purchases where id=$1", [po.id]))
    .rows[0];
  assert.equal(purchase.status, "PARTIAL");
  assert.equal(Number(purchase.received), 4);
  await assert.rejects(
    api("receive_purchase", { ...p, requestKey: crypto.randomUUID(), quantity: 20 }),
    /physically accepted/,
  );
  await assert.rejects(
    api("cancel_purchase", { restaurantId: restaurant.id, id: po.id }),
    /existing commitment/,
  );
});
test("supplier catalog and quotes are isolated; changed terms invalidate owner approval", async () => {
  await signIn(outsider);
  const s = await api("register_supplier", {
    name: "Test supplier",
    areas: "Davao",
    leadDays: 1,
    minimumOrder: 0,
  });
  const product = await api("save_supplier_product", {
    supplierId: s.id,
    sku: "demo-basil",
    name: "Basil",
    category: "Produce",
    unit: "kg",
    packSize: 1,
    packPrice: 40000,
  });
  assert.equal((await api("supplier_snapshot")).suppliers.length, 1);
  await assert.rejects(
    api("save_supplier_product", { supplierId: crypto.randomUUID(), sku: "x", name: "Basil" }),
    /Supplier access denied/,
  );
  await db.query("insert into cc_private.supplier_links values($1,$2,'approved')", [
    restaurant.id,
    s.id,
  ]);
  const ingredient = (await db.query("select id from cc_private.ingredients where code='basil'"))
    .rows[0].id;
  await signIn(owner);
  const po = await api("create_purchase", {
    restaurantId: restaurant.id,
    productId: product.id,
    ingredientId: ingredient,
    packs: 2,
    requestKey: crypto.randomUUID(),
  });
  await api("request_quote", { restaurantId: restaurant.id, id: po.id });
  await signIn(outsider);
  await api("submit_quote", {
    supplierId: s.id,
    id: po.id,
    expectedVersion: 1,
    packPrice: 39000,
    deliveryFee: 10000,
    terms: "Tuesday",
  });
  await signIn(owner);
  await api("approve_purchase", { restaurantId: restaurant.id, id: po.id, expectedVersion: 2 });
  await signIn(outsider);
  await api("submit_quote", {
    supplierId: s.id,
    id: po.id,
    expectedVersion: 2,
    packPrice: 38000,
    deliveryFee: 20000,
    terms: "Wednesday",
  });
  await signIn(owner);
  await assert.rejects(
    api("confirm_purchase", {
      restaurantId: restaurant.id,
      id: po.id,
      expectedVersion: 2,
      reference: "stale",
    }),
    /approval/,
  );
  const record = (await db.query("select * from cc_private.purchases where id=$1", [po.id]))
    .rows[0];
  assert.equal(record.approved_version, null);
  assert.equal(record.status, "QUOTED");
});
test("real role grants deny direct writes and expose only sanitized public menu", async () => {
  await signIn(null);
  await db.exec("set role anon");
  await assert.rejects(db.query("select * from cc_private.orders"), /permission denied/);
  const m = await api("menu", { slug: "marinara-ristorante" });
  assert.equal(m.items.length, 12);
  assert.equal(m.items[0].average_cost, undefined);
  assert.equal(m.items[0].recipe, undefined);
  await assert.rejects(api("configure", { restaurantId: restaurant.id, mode: "buy" }), /Sign in/);
  await db.exec("reset role");
});
test("public QR order → reserve → prepare → complete; retries never duplicate deductions", async () => {
  await signIn(owner);
  await api("set_ordering", { restaurantId: restaurant.id, enabled: true });
  await signIn(null);
  const request = {
    stationToken: station.token,
    requestKey: crypto.randomUUID(),
    items: [{ id: menu[0].id, quantity: 2, price: menu[0].price }],
    note: "Demo test",
  };
  const order = await api("place_order", request);
  const retry = await api("place_order", request);
  assert.equal(order.id, retry.id);
  await assert.rejects(api("place_order", { ...request, note: "changed" }), /already used/);
  await assert.rejects(
    api("place_order", {
      ...request,
      requestKey: crypto.randomUUID(),
      items: [{ ...request.items[0], price: 1 }],
    }),
    /price changed/,
  );
  assert.equal(
    await api("order_status", { id: order.id, receiptToken: crypto.randomUUID() }),
    null,
  );
  assert.equal(
    (await api("order_status", { id: order.id, receiptToken: order.receiptToken })).status,
    "NEW",
  );
  const before = (await db.query("select * from cc_private.ingredients order by id")).rows;
  await signIn(owner);
  for (const [status, expectedStatus] of [
    ["ACCEPTED", "NEW"],
    ["PREPARING", "ACCEPTED"],
    ["READY", "PREPARING"],
    ["COMPLETED", "READY"],
  ]) {
    await api("transition_order", {
      restaurantId: restaurant.id,
      id: order.id,
      status,
      expectedStatus,
    });
    await api("transition_order", {
      restaurantId: restaurant.id,
      id: order.id,
      status,
      expectedStatus,
    });
  }
  const usage = (
    await db.query("select * from cc_private.order_usage where order_id=$1", [order.id])
  ).rows;
  const after = (await db.query("select * from cc_private.ingredients order by id")).rows;
  for (const u of usage) {
    const b = before.find((x) => x.id === u.ingredient_id),
      a = after.find((x) => x.id === u.ingredient_id);
    assert.ok(Math.abs(Number(b.on_hand) - Number(a.on_hand) - Number(u.quantity)) < 0.0001);
    assert.equal(a.reserved, b.reserved);
  }
  assert.equal((await db.query("select count(*) as n from cc_private.external_jobs")).rows[0].n, 0);
});

test("stock count rejects stale state and adjustment retries require the same intent", async () => {
  await signIn(owner);
  const g = (await db.query("select * from cc_private.ingredients where code='basil'")).rows[0];
  const p = {
    restaurantId: restaurant.id,
    id: g.id,
    kind: "count",
    expectedOnHand: Number(g.on_hand),
    quantity: Number(g.on_hand) + 1,
    reason: "Verified physical count",
    requestKey: crypto.randomUUID(),
  };
  await api("adjust_stock", p);
  await api("adjust_stock", p);
  await assert.rejects(api("adjust_stock", { ...p, quantity: 5 }), /different adjustment/);
  await assert.rejects(
    api("adjust_stock", { ...p, requestKey: crypto.randomUUID() }),
    /Stock changed/,
  );
});

test("unverified accounts and invitations cannot confer another business or owner authority", async () => {
  const id = (
    await db.query(
      "insert into auth.users values(gen_random_uuid(),'unverified@example.invalid',null) returning id",
    )
  ).rows[0].id;
  await db.query(
    "insert into platform.business_memberships(business_id,user_id,member_role,status) values($1,$2,'owner','active')",
    [restaurant.business_id, id],
  );
  await signIn(id);
  await assert.rejects(api("snapshot", { restaurantId: restaurant.id }), /Sign in/);
  await signIn(owner);
  const invite = await api("create_invite", {
    restaurantId: restaurant.id,
    email: "invited@example.invalid",
    role: "editor",
  });
  await signIn(outsider);
  await assert.rejects(api("accept_invite", { token: invite.token }), /another verified/);
  await signIn(owner);
  await assert.rejects(
    api("update_member", {
      restaurantId: restaurant.id,
      userId: owner,
      role: "viewer",
      status: "disabled",
    }),
    /own owner access/,
  );
});

test("purchasing rules respect hard price, exact terms, minimum order and aggregate daily authority", async () => {
  await signIn(owner);
  const product = (
    await db.query(
      "select sp.* from cc_private.supplier_products sp join cc_private.suppliers s on s.id=sp.supplier_id where s.demo order by sp.id limit 1",
    )
  ).rows[0];
  const g = (
    await db.query(
      "select * from cc_private.ingredients where restaurant_id=$1 and unit=$2 limit 1",
      [restaurant.id, product.unit],
    )
  ).rows[0];
  const price = Number(product.pack_price),
    total = price * 2;
  await db.query("update cc_private.suppliers set minimum_order=0 where id=$1", [
    product.supplier_id,
  ]);
  await db.query(
    "update cc_private.restaurants set integrations_ready=true,jourvis_mode='buy',per_order_limit=$2,daily_limit=$2 where id=$1",
    [restaurant.id, total + 1],
  );
  await api("save_rule", {
    restaurantId: restaurant.id,
    ingredientId: g.id,
    productId: product.id,
    packs: 2,
    enabled: true,
    target: price,
    autoLimit: price,
    hardLimit: price,
    terms: "Agreed terms",
  });
  const make = async () => {
    const po = await api("create_purchase", {
      restaurantId: restaurant.id,
      ingredientId: g.id,
      productId: product.id,
      packs: 2,
      requestKey: crypto.randomUUID(),
    });
    await db.query(
      "update cc_private.purchases set status='QUOTED',terms='Agreed terms',auto_pack_limit=$2 where id=$1",
      [po.id, price],
    );
    return po;
  };
  const po = await make();
  await db.query("update cc_private.purchases set pack_price=pack_price+1 where id=$1", [po.id]);
  await api("evaluate", { restaurantId: restaurant.id });
  const status = async (id) =>
    (await db.query("select status from cc_private.purchases where id=$1", [id])).rows[0].status;
  assert.equal(await status(po.id), "QUOTED");
  await db.query(
    "update cc_private.purchases set pack_price=$2,terms='Unexpected terms' where id=$1",
    [po.id, price],
  );
  await api("evaluate", { restaurantId: restaurant.id });
  assert.equal(await status(po.id), "QUOTED");
  await db.query("update cc_private.purchases set terms='Agreed terms' where id=$1", [po.id]);
  await db.query("update cc_private.suppliers set minimum_order=$2 where id=$1", [
    product.supplier_id,
    total + 100,
  ]);
  await api("evaluate", { restaurantId: restaurant.id });
  assert.equal(await status(po.id), "QUOTED");
  await db.query("update cc_private.suppliers set minimum_order=0 where id=$1", [
    product.supplier_id,
  ]);
  await api("evaluate", { restaurantId: restaurant.id });
  assert.equal(await status(po.id), "APPROVED");
  const second = await make();
  await api("evaluate", { restaurantId: restaurant.id });
  assert.equal(await status(second.id), "QUOTED");
  await assert.rejects(
    api("queue_supplier_contact", { restaurantId: restaurant.id, id: po.id }),
    /Demo suppliers/,
  );
  assert.equal((await db.query("select count(*) n from cc_private.external_jobs")).rows[0].n, 0);
  await api("configure", {
    restaurantId: restaurant.id,
    mode: "sleeping",
    perOrderLimit: 0,
    dailyLimit: 0,
  });
});

test("external leases dispatch once, validate receipts and never replay uncertain sends", async () => {
  await signIn(owner);
  const po = (
    await db.query(
      "select * from cc_private.purchases where status='APPROVED' order by created_at desc limit 1",
    )
  ).rows[0];
  await db.query(
    "update cc_private.suppliers set demo=false,contact_email='supplier@example.com' where id=$1",
    [po.supplier_id],
  );
  await api("queue_supplier_contact", { restaurantId: restaurant.id, id: po.id });
  const job = await api("claim_job", { restaurantId: restaurant.id });
  assert.ok(job.leaseToken);
  await signIn(null);
  await assert.rejects(
    api("begin_action", { id: job.id, leaseToken: crypto.randomUUID() }),
    /expired or already/,
  );
  const ready = await api("begin_action", { id: job.id, leaseToken: job.leaseToken });
  assert.equal(ready.purchase.id, po.id);
  await assert.rejects(
    api("begin_action", { id: job.id, leaseToken: job.leaseToken }),
    /expired or already/,
  );
  await assert.rejects(
    api("job_result", { id: job.id, leaseToken: job.leaseToken, status: "succeeded" }),
    /receipt/,
  );
  await api("job_result", {
    id: job.id,
    leaseToken: job.leaseToken,
    status: "uncertain",
    errorCode: "network_timeout",
  });
  await signIn(owner);
  assert.equal(await api("claim_job", { restaurantId: restaurant.id }), null);
  await assert.rejects(
    api("cancel_purchase", { restaurantId: restaurant.id, id: po.id }),
    /Reconcile/,
  );
  await assert.rejects(
    db.query("select public.cc_worker($1,'claim')", ["invalid".repeat(8)]),
    /Worker access denied/,
  );
});

test("the initial owner grant is claimed only by the requested verified email", async () => {
  const business = (
    await db.query(
      "insert into platform.businesses(business_key,display_name) values('isolated-owner-bootstrap','Isolated bootstrap') returning id",
    )
  ).rows[0].id;
  const r = (
    await db.query(
      "insert into cc_private.restaurants(business_id,slug,name) values($1,'isolated-owner-bootstrap','Isolated bootstrap') returning id",
      [business],
    )
  ).rows[0].id;
  const u = (
    await db.query(
      "insert into auth.users values(gen_random_uuid(),'bootstrap@example.invalid',null) returning id",
    )
  ).rows[0].id;
  await db.query(
    "insert into cc_private.invites(restaurant_id,email,role) values($1,'bootstrap@example.invalid','owner')",
    [r],
  );
  await signIn(outsider);
  assert.equal(
    (await api("my_businesses")).some((b) => b.id === r),
    false,
  );
  await signIn(u);
  await assert.rejects(api("my_businesses"), /verified account/);
  await db.query("update auth.users set email_confirmed_at=now() where id=$1", [u]);
  const businesses = await api("my_businesses");
  assert.equal(businesses.find((b) => b.id === r).role, "owner");
  await api("my_businesses");
  assert.equal(
    (
      await db.query("select count(*) n from platform.business_memberships where business_id=$1", [
        business,
      ])
    ).rows[0].n,
    1,
  );
});

test("owner reconciliation requires evidence and a separate idempotent retry authorization", async () => {
  await signIn(owner);
  const job = (
    await db.query("select * from cc_private.external_jobs where status='uncertain' limit 1")
  ).rows[0];
  await assert.rejects(
    api("retry_action", { restaurantId: restaurant.id, id: job.id }),
    /Verify that no message/,
  );
  await assert.rejects(
    api("reconcile_job", {
      restaurantId: restaurant.id,
      id: job.id,
      outcome: "not_sent",
      reference: "no",
    }),
    /verified outcome/,
  );
  await api("reconcile_job", {
    restaurantId: restaurant.id,
    id: job.id,
    outcome: "not_sent",
    reference: "Provider sent records verified empty",
  });
  await api("retry_action", { restaurantId: restaurant.id, id: job.id });
  await api("retry_action", { restaurantId: restaurant.id, id: job.id });
  assert.equal(
    (
      await db.query("select count(*) n from cc_private.external_jobs where idempotency_key=$1", [
        job.id + ":owner-retry",
      ])
    ).rows[0].n,
    1,
  );
});
