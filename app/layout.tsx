import type { Metadata } from "next";
import "./v2.css";
import "./supplier.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://jourvis.ai"),
  title: { default: "COMMAND-CENTER | Jourvis", template: "%s | Jourvis" },
  description: "Jourvis and your business, working together.",
  icons: { icon: "/favicon.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
