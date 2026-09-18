import { listCommandCenterBusinesses } from "@/command-center/core/business-registry";
import BusinessBrandMark from "@/components/command-center/BusinessBrandMark";

export default function CommandCenterIndexPage() {
  const businesses = listCommandCenterBusinesses();
  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "5rem 5.6%" }}>
      <p style={{ color: "var(--mint)", font: "0.72rem var(--font-mono)", letterSpacing: "0.12em" }}>
        JOURVIS COMMAND CENTER
      </p>
      <h1 style={{ marginTop: "0.6rem", fontSize: "clamp(3rem, 6vw, 6rem)" }}>
        Choose a business.
      </h1>
      <p style={{ marginTop: "1rem", maxWidth: 720, color: "var(--slate)" }}>
        One shared Command Center. Jourvis adapts the operating modules, data,
        forecasts, finance, decisions, and automation to each business.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 32 }}>
        {businesses.map((business) => (
          <a
            key={business.id}
            href={`/command-center/${business.id}`}
            style={{
              border: "1px solid var(--border)",
              padding: 18,
              background: "#0b1922",
              display: "grid",
              gridTemplateColumns: "56px minmax(0, 1fr)",
              gap: 14,
              alignItems: "center",
            }}
          >
            <span
              style={{
                width: 56,
                height: 56,
                display: "block",
                border: "1px solid var(--border)",
                background: "#08161e",
                padding: 5,
              }}
            >
              <BusinessBrandMark
                businessId={business.id}
                businessName={business.name}
              />
            </span>
            <span>
              <span style={{ display: "block", color: "var(--mint)", fontSize: 11, letterSpacing: "0.08em" }}>
                {business.industry.toUpperCase()}
              </span>
              <strong style={{ display: "block", marginTop: 6, fontSize: 18 }}>{business.name}</strong>
              <small style={{ display: "block", marginTop: 6, color: "var(--slate)" }}>
                {business.operations.length} operating modules
              </small>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
