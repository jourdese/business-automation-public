# Sign-in email through n8n

Supabase verifies identities and issues sessions. n8n sends verification emails through the existing Gmail OAuth credential. No SMTP vendor is required for this demo.

```text
Account form → Supabase Auth → signed Send Email Hook
  → jourvis.ai/api/auth/email → metadata-only delivery claim
  → authenticated n8n webhook → consume one-time capability
  → Gmail → provider receipt → mark sent → acknowledge hook
  → user follows verification link → PKCE callback → membership check
```

The hook is disabled by default. Importing the workflow or deploying the website does not enable it. No live emails have been sent to validate it yet.

## Configuration

1. Apply the reviewed `command_center_auth_mail` migration after core V2. It adds only private metadata tables and a checked RPC. Do not blanket-push this frontend repository's migration history into the shared project.
2. Import `workflows/command-center-v2-auth-email.json` as a new inactive workflow named `INTEGRATION | COMMANDCENTER | Auth Email V2`. Do not replace existing Gmail, Messenger or supplier-action workflows.
3. Bind its webhook to a new Header Auth credential named `Command Center auth mail key`, header `x-jourvis-auth-key`, with a securely generated random value of at least 40 characters. Set the matching server-only `CC_N8N_AUTH_SECRET` in Vercel, separate from supplier-action credentials.
4. Bind `Command Center Supabase publishable apikey` to header `apikey` and the existing Supabase publishable key. Bind the Gmail node to the existing `Gmail account` credential; the export references its current ID. Never export the OAuth secret.
5. Browser JSON imports can reset workflow settings and auto-select the only Header Auth credential: explicitly check every binding after import; never accept the existing Jourvis gateway credential by accident. Confirm workflow settings save no successful, failed, manual or in-progress execution data. No error workflow may forward payloads. Automatic node retries must stay disabled. Never pin data or manually execute with a real verification link. Do not enable execution streaming or request-body capture for this route. The email itself necessarily remains in Gmail's Sent folder.
6. Generate a separate random `CC_AUTH_MAIL_TOKEN` of at least 40 characters, stored only in the server environment. Compute its SHA-256 digest locally; provision only the digest in the SQL editor:

   ```sql
   insert into cc_private.auth_mail_grant(singleton, token_hash, enabled)
   values (true, '<64-character SHA-256 hex digest>', false);
   ```

   If a grant already exists, inspect and reuse its matching configured token instead of replacing it blindly. This capability only manages authentication delivery records, not business or user accounts.

7. Prepare a Supabase HTTP Send Email Hook at `https://jourvis.ai/api/auth/email`. Store its generated signing secret as server-only `CC_AUTH_HOOK_SECRET` (`v1,whsec_…` is accepted). Do not enable the hook before deploying the route.
8. Set `CC_N8N_AUTH_URL` to the new workflow's production HTTPS URL and `CC_AUTH_EMAIL_ENABLED=true` for the next approved deployment. Never put these settings in `NEXT_PUBLIC_*`, Git or chat.
9. Keep Supabase Email Provider and email confirmation enabled, with the exact allowed callback `https://jourvis.ai/account/confirm`. The hook is project-wide: inventory other applications using this project's Auth before activation. This implementation rejects other callbacks rather than hijacking another application's sign-in. Review and test any explicit callback extension first.

## Activation — the user controls deployment

1. Finish credential binding and activate only the new auth-mail workflow. Enable its private grant after verifying the hash matches the Vercel token.
2. The user deploys the reviewed website. Confirm the production route exists and rejects an unsigned request without sending. Do not enable the hook while its route/configuration is unavailable.
3. Enable the prepared Supabase Send Email Hook. It replaces SMTP for this project's auth mail.
4. With separate authorization, perform one real owner sign-in. Check the Gmail receipt, received message, successful callback and correct membership. Then verify an invited supplier cannot access owner records. Local tests do not establish live delivery or latency.

Supabase allows five seconds for HTTP hooks. The application bounds each database request to 800 ms and n8n to 2.2 seconds, without automatic resend. The desktop, tunnel and Gmail credential must remain available. Measure real latency before public onboarding. If this path cannot reliably meet the budget, keep it disabled and use a direct email provider/SMTP or a separately approved durable mail queue. Never acknowledge an unverified send as successful.

## Failure and rollback

- Invalid signature, stale timestamp, oversized body, unsupported event or unapproved callback: no database claim and no n8n call.
- A completed duplicate returns saved success without sending again.
- An in-flight or uncertain attempt cannot be replayed. After resolving connectivity, request a new sign-in link; the new event has its own capability. A failed email never grants access.
- n8n consumes a capability bound to the exact recipient and fixed message before Gmail. Replays or changed envelopes cannot send again.
- Email changes use Supabase's documented old/new hash mapping. Templates never render editable user metadata.
- The database stores only hashed event/envelope/lease identifiers, state and timestamps. It stores no address, body, OTP or verification link. Administrators may prune metadata older than 30 days; preserve pending records during incidents. Signature expiry is checked independently.

Disable the Supabase hook before rolling the website back to a version without `/api/auth/email`, then disable only the new auth workflow/grant. Default Supabase SMTP resumes but its recipient restrictions still apply; it is not a public-onboarding fallback. Never disable identity verification to recover email delivery.

References: [Supabase Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook), [hook timeout](https://supabase.com/docs/guides/auth/auth-hooks), [default SMTP restrictions](https://supabase.com/docs/guides/auth/auth-smtp), [Standard Webhooks](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md).
