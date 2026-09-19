import AccountForm from "@/components/AccountForm";
import JourvisCompanion from "@/components/jourvis/JourvisCompanion";
import { configured } from "@/lib/supabase/server";
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <main id="main" className="auth-page">
      <a href="/" className="brand-link">
        Jourvis
      </a>
      <JourvisCompanion size={88} />
      <p className="eyebrow">A LITTLE LESS TO HOLD</p>
      <h1>
        Your business.
        <br />
        Your place to begin.
      </h1>
      <p>Sign in to operate your business or manage your supplier catalog.</p>
      {error === "expired" && (
        <p role="alert">
          That sign-in link expired or could not be verified. Request a new link and open it in this
          browser.
        </p>
      )}
      <AccountForm configured={configured()} next={next} />
      <small>Access follows your verified account and business membership.</small>
    </main>
  );
}
