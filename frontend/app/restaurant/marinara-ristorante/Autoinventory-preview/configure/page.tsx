"use client";

import { useEffect } from "react";

const TARGET = "/command-center/marinara-ristorante/operations/inventory";

export default function MarinaraLegacyInventoryRedirect() {
  useEffect(() => {
    window.location.replace(TARGET);
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#07131b",
        color: "#f7f4ee",
      }}
    >
      <p style={{ margin: 0, fontFamily: "monospace", fontSize: "14px" }}>
        Marinara Inventory moved to Jourvis Command Center.{" "}
        <a style={{ color: "#a7e3c5" }} href={TARGET}>
          Continue to Inventory
        </a>
      </p>
    </main>
  );
}
