-- Metadata only: no email address, verification link, OTP or message body is stored.
create table cc_private.auth_mail_grant (
  singleton boolean primary key default true check(singleton),
  token_hash text not null check(token_hash ~ '^[0-9a-f]{64}$'),
  enabled boolean not null default false
);
create table cc_private.auth_mail_deliveries (
  id text primary key check(id ~ '^[0-9a-f]{64}$'),
  payload_digest text not null check(payload_digest ~ '^[0-9a-f]{64}$'),
  lease_hash text not null,
  state text not null check(state in ('claimed','sending','sent')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table cc_private.auth_mail_grant enable row level security;
alter table cc_private.auth_mail_deliveries enable row level security;
revoke all on cc_private.auth_mail_grant,cc_private.auth_mail_deliveries from public,anon,authenticated;

create function cc_private.auth_mail(token text, op text, p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare row cc_private.auth_mail_deliveries; lease uuid; inserted integer;
begin
  if p is null or octet_length(p::text)>12000 or (p->>'id') is null or (p->>'id') !~ '^[0-9a-f]{64}$' then raise exception 'Invalid mail operation' using errcode='42501'; end if;
  if op='begin' then
    -- One-time capability, tied to the exact approved envelope; no worker token in n8n.
    select * into row from cc_private.auth_mail_deliveries where id=p->>'id' for update;
    if row.id is null or row.state<>'claimed' or row.created_at<now()-interval '30 seconds'
      or (p->>'lease') is null or row.lease_hash<>encode(sha256(convert_to(p->>'lease','UTF8')),'hex')
      or (p->>'messageJson') is null or row.payload_digest<>encode(sha256(convert_to(p->>'messageJson','UTF8')),'hex')
      or not exists(select 1 from cc_private.auth_mail_grant where enabled)
      then raise exception 'Mail capability denied' using errcode='42501'; end if;
    update cc_private.auth_mail_deliveries set state='sending' where id=row.id;
    return jsonb_build_object('state','sending');
  end if;
  if token is null or length(token)<40 or not exists(select 1 from cc_private.auth_mail_grant where enabled and token_hash=encode(sha256(convert_to(token,'UTF8')),'hex')) then raise exception 'Mail worker denied' using errcode='42501'; end if;
  if op='claim' then
    if (p->>'digest') is null or (p->>'digest') !~ '^[0-9a-f]{64}$' then raise exception 'Invalid mail digest'; end if;
    lease:=gen_random_uuid();
    insert into cc_private.auth_mail_deliveries(id,payload_digest,lease_hash,state)
      values(p->>'id',p->>'digest',encode(sha256(convert_to(lease::text,'UTF8')),'hex'),'claimed') on conflict do nothing;
    get diagnostics inserted=row_count;
    if inserted=1 then return jsonb_build_object('state','claimed','lease',lease); end if;
    select * into row from cc_private.auth_mail_deliveries where id=p->>'id';
    if row.payload_digest<>p->>'digest' then raise exception 'Mail digest mismatch'; end if;
    return jsonb_build_object('state',case when row.state='sent' then 'sent' else 'uncertain' end);
  elsif op='finish' then
    update cc_private.auth_mail_deliveries set state='sent',sent_at=now()
      where id=p->>'id' and state='sending' and lease_hash=encode(sha256(convert_to(p->>'lease','UTF8')),'hex');
    if not found then raise exception 'Mail receipt denied' using errcode='42501'; end if;
    return jsonb_build_object('state','sent');
  end if;
  raise exception 'Unsupported mail operation' using errcode='42501';
end $$;
revoke all on function cc_private.auth_mail(text,text,jsonb) from public;
grant execute on function cc_private.auth_mail(text,text,jsonb) to anon,authenticated;
create function public.cc_auth_mail(token text,op text,p jsonb) returns jsonb language sql security invoker set search_path='' as $$ select cc_private.auth_mail(token,op,p) $$;
revoke all on function public.cc_auth_mail(text,text,jsonb) from public;
grant execute on function public.cc_auth_mail(text,text,jsonb) to anon,authenticated;
