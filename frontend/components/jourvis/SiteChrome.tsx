/* oxlint-disable nextjs/no-html-link-for-pages */
// Static document navigation avoids the client router error on the Vercel export.
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { siteConfig } from '@/lib/jourvis/config';

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="wordmark" href="/" aria-label="Jourvis home">
        Jourvis<span className="wordmark-dot">.</span>
      </a>
      <nav aria-label="Main navigation">
        <a href="/#outcomes">What I do</a>
        <a href="/#principles">My approach</a>
        <a className="nav-cta" href="/#demo" data-assist>
          Try Jourvis <ArrowUpRight size={16} aria-hidden />
        </a>
      </nav>
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <a href="/" className="wordmark">
          Jourvis<span className="wordmark-dot">.</span>
        </a>
        <span>Business, with a little more breathing room.</span>
      </div>
      <div className="footer-links">
        <a href="/privacy">Privacy</a>
        <a href="/data-deletion">Data deletion</a>
        <a href={'mailto:' + siteConfig.contactEmail}>
          Contact <ArrowUpRight size={14} aria-hidden />
        </a>
      </div>
      <div className="footer-note">
        <span>Business Automation · Operated by Jour</span>
        <a href="#main">
          Back to top <ArrowRight size={14} className="rotate-up" aria-hidden />
        </a>
      </div>
    </footer>
  );
}
