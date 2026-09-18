"use client";

import { useEffect } from "react";

export default function AutoinventoryConfigurePage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stock = params.get("stock") ?? "shrimp";
    const next = new URL(
      "/restaurant/marinara-ristorante/Autoinventory-preview",
      window.location.origin,
    );
    next.searchParams.set("jourvis", "update");
    next.searchParams.set("stock", stock);
    window.location.replace(next.toString());
  }, []);

  return null;
}
