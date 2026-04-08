'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const LINKS = [
  { href: '/',          label: 'Home' },
  { href: '/graveyard', label: 'Graveyard' },
  { href: '/stats',     label: 'Stats' },
  { href: '/about',     label: 'About' },
];

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 border-b border-border"
      style={{ background: 'rgba(13,11,30,0.97)', backdropFilter: 'blur(6px)' }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-cream hover:text-purpleLight transition-colors"
          style={{ fontFamily: 'var(--font-pixel)', fontSize: 10 }}
        >
          🪦 bury.lol
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map(l => {
            const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}
                className={`transition-colors ${
                  active ? 'text-cream' : 'text-muted hover:text-cream'
                }`}
              >
                {active && <span className="mr-1 text-purple">▶</span>}
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* CTA + mobile toggle */}
        <div className="flex items-center gap-3">
          <Link
            href="/bury"
            className="btn-purple px-4 py-2"
            style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}
          >
            Dig a grave →
          </Link>
          <button
            className="flex flex-col gap-1 md:hidden"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {[0,1,2].map(i => (
              <span key={i} className="block h-0.5 w-5 bg-muted" />
            ))}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="border-t border-border bg-surface px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {LINKS.map(l => {
              const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}
                  className={active ? 'text-cream' : 'text-muted'}
                >
                  {active && <span className="mr-2 text-purple">▶</span>}
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
