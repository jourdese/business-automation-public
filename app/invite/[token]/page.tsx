import { notFound, redirect } from "next/navigation";
import AcceptInvite from "@/components/AcceptInvite";
export const metadata = {
  title: "Your Jourvis invitation",
  robots: { index: false, follow: false },
};
export default async function Invitation({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ supplier?: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(token)) notFound();
  if ((await searchParams).supplier) redirect(`/suppliers?invite=${token}`);
  return (
    <main id="main" className="auth-page">
      <p className="eyebrow">A PLACE ON THE TEAM</p>
      <h1>You’re invited.</h1>
      <p>
        Accept with the verified email this invitation was sent to. The invitation grants only the
        role chosen by the business owner.
      </p>
      <AcceptInvite token={token} />
    </main>
  );
}
