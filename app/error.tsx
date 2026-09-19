"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="auth-page">
      <h1>Let’s reconnect.</h1>
      <p>This page could not load. Your saved business records remain in the database.</p>
      <button onClick={reset}>Try again</button>
      <a href="/">Back to Jourvis</a>
    </main>
  );
}
