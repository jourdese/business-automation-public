// Isolated browser verification host. Never connects to Supabase or n8n.
import { createServer } from "node:http";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { seedSql } from "./seed-demo.mjs";
if (process.env.VERCEL || process.env.NODE_ENV === "production")
  throw new Error("Local verification is forbidden in production");
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth; create schema platform;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table platform.businesses(id uuid primary key default gen_random_uuid(),business_key text unique,display_name text,status text default 'draft',timezone text default 'UTC',locale text default 'en',metadata jsonb default '{}');
create table platform.business_memberships(id uuid primary key default gen_random_uuid(),business_id uuid references platform.businesses(id),user_id uuid references auth.users(id),member_role text,status text,unique(business_id,user_id));`);
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
await db.exec(seedSql(today));
const owner = (
  await db.query(
    "insert into auth.users values(gen_random_uuid(),'owner@local.invalid',now()) returning id",
  )
).rows[0].id;
await db.query(
  "insert into platform.business_memberships(business_id,user_id,member_role,status) select business_id,$1,'owner','active' from cc_private.restaurants",
  [owner],
);
const vendor = (
  await db.query(
    "insert into auth.users values(gen_random_uuid(),'supplier@local.invalid',now()) returning id",
  )
).rows[0].id;
let queue = Promise.resolve();
const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/command") {
    res.writeHead(404).end();
    return;
  }
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 18000) {
      res.writeHead(413).end();
      return;
    }
  }
  queue = queue.then(async () => {
    try {
      const { op, p } = JSON.parse(body);
      const user = ["menu", "place_order", "order_status"].includes(op)
        ? ""
        : /supplier_snapshot|register_supplier|save_supplier_product|submit_quote|accept_supplier_invite/.test(
              op,
            )
          ? vendor
          : owner;
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
      const data = (
        await db.query("select public.cc_api($1,$2::jsonb) data", [op, JSON.stringify(p)])
      ).rows[0].data;
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ data }));
    } catch (e) {
      res
        .writeHead(400, { "content-type": "application/json" })
        .end(JSON.stringify({ error: e.message }));
    }
  });
});
server.listen(4319, "127.0.0.1", () =>
  console.log("Isolated SQL fixture ready on 127.0.0.1:4319. No live services connected."),
);
