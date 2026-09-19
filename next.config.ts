import type { NextConfig } from "next";
import { existsSync, readFileSync } from "node:fs";
const legacy = existsSync("public/legacy-routes.json")
  ? (JSON.parse(readFileSync("public/legacy-routes.json", "utf8")) as string[])
  : [];
const config: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: legacy
        .filter((path) => path !== "/restaurant/marinara-ristorante")
        .flatMap((path) => {
          const source = path.replace("/command-center", "/command-center-v1");
          const destination = `/legacy${path === "/" ? "/index" : path}`;
          return [
            { source, destination: `${destination}.html` },
            ...(source === "/"
              ? []
              : [{ source: `${source}.rsc`, destination: `${destination}.rsc` }]),
          ];
        }),
      fallback: [],
    };
  },
};
export default config;
