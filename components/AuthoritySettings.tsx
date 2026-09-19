"use client";
import { useState } from "react";
import type { Snapshot } from "@/lib/types";
import type { RunCommand } from "./WorkspaceUI";
import { centavos, money } from "@/lib/format";
export default function AuthoritySettings({
  data,
  run,
  busy,
}: {
  data: Snapshot;
  run: RunCommand;
  busy: boolean;
}) {
  const [ingredient, setIngredient] = useState(data.ingredients[0]?.id || "");
  const [error, setError] = useState("");
  const rule = data.rules.find((r) => r.ingredient_id === ingredient);
  const unit = data.ingredients.find((i) => i.id === ingredient)?.unit;
  const owner = ["owner", "admin"].includes(data.role);
  return (
    <>
      <section className="surface">
        <details>
          <summary>Ingredient purchasing rules</summary>
          <p>
            Pick a product, quantity and price ceilings. Jourvis uses these only while the matching
            mode is awake. New terms always need review.
          </p>
          <label>
            Ingredient
            <select value={ingredient} onChange={(e) => setIngredient(e.target.value)}>
              {data.ingredients.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <form
            key={ingredient + String(rule?.hard_pack_limit)}
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              const f = new FormData(e.currentTarget);
              try {
                await run("save_rule", {
                  ingredientId: ingredient,
                  productId: f.get("product"),
                  packs: Number(f.get("packs")),
                  enabled: f.get("enabled") === "on",
                  target: centavos(String(f.get("target"))),
                  autoLimit: centavos(String(f.get("auto"))),
                  hardLimit: centavos(String(f.get("hard"))),
                  terms: f.get("terms"),
                });
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not save rule.");
              }
            }}
          >
            <fieldset disabled={!owner || busy}>
              <label>
                Approved supplier product
                <select
                  name="product"
                  required
                  defaultValue={
                    rule?.product_id ||
                    data.supplierProducts.find(
                      (p) => p.name === data.ingredients.find((i) => i.id === ingredient)?.name,
                    )?.id
                  }
                >
                  {data.supplierProducts
                    .filter((p) => p.unit === unit && p.available)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {data.suppliers.find((s) => s.id === p.supplier_id)?.name} ·{" "}
                        {money(p.pack_price)}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Reorder packs
                <input
                  name="packs"
                  type="number"
                  min="1"
                  max="1000"
                  defaultValue={rule?.packs || 1}
                  required
                />
              </label>
              <div className="form-grid">
                <label>
                  Target / pack (PHP)
                  <input
                    name="target"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={(rule?.target_pack_price || 0) / 100}
                    required
                  />
                </label>
                <label>
                  Automatic ceiling / pack (PHP)
                  <input
                    name="auto"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={(rule?.auto_pack_limit || 0) / 100}
                    required
                  />
                </label>
                <label>
                  Hard ceiling / pack (PHP)
                  <input
                    name="hard"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={(rule?.hard_pack_limit || 0) / 100}
                    required
                  />
                </label>
              </div>
              <label>
                Exact pre-approved supplier terms
                <textarea name="terms" maxLength={1000} defaultValue={rule?.approved_terms || ""} />
              </label>
              <label className="check-label">
                <input name="enabled" type="checkbox" defaultChecked={rule?.enabled || false} />
                Authorize this rule while Jourvis is awake
              </label>
              <button>Save ingredient authority</button>
            </fieldset>
            {error && <p role="alert">{error}</p>}
            <small>
              Automatic buying also checks delivery fees, minimum order, your daily total and your
              per-purchase ceiling. Changed terms or exceeded limits remain yours to decide.
            </small>
          </form>
        </details>
      </section>
      <section className="surface">
        <h2>People with access</h2>
        {data.members.map((member) => (
          <div className="readiness-row" key={member.userId}>
            <div>
              <strong>{member.email}</strong>
              <small>
                {member.role} · {member.status}
              </small>
            </div>
            {data.role === "owner" && member.role !== "owner" && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  void run("update_member", {
                    userId: member.userId,
                    role: member.role,
                    status: member.status === "active" ? "disabled" : "active",
                  }).catch(() => {})
                }
              >
                {member.status === "active" ? "Revoke" : "Restore"}
              </button>
            )}
          </div>
        ))}
        <small>
          Access is checked against current membership on every operation. Supplier accounts have a
          separate boundary.
        </small>
      </section>
    </>
  );
}
