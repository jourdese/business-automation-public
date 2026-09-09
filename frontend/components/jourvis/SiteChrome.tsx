import Link from 'next/link';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { siteConfig } from '@/lib/jourvis/config';

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="Jourvis home">
        Jourvis<span className="wordmark-dot">.</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/#outcomes">What I do</Link>
        <Link href="/#principles">My approach</Link>
        <Link className="nav-cta" href="/#demo" data-assist>
          Try Jourvis <ArrowUpRight size={16} aria-hidden />
        </Link>
      </nav>
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Link href="/" className="wordmark">
          Jourvis<span className="wordmark-dot">.</span>
        </Link>
        <span>Business, with a little more breathing room.</span>
      </div>
      <div className="footer-links">
        <Link href="/privacy">Privacy</Link>
        <Link href="/data-deletion">Data deletion</Link>
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
