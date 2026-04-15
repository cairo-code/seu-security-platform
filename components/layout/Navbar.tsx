'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUser, clearAuth } from '@/lib/auth/client';

const navLinks = [
  { href: '/challenges', label: 'Challenges' },
  { href: '/paths', label: 'Paths' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getUser());
    setLoading(false);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* Ignore */ }
    clearAuth();
    router.push('/login');
  };

  if (loading) {
    return (
      <nav
        style={{
          height: '48px',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border-2)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      />
    );
  }

  if (!user) return null;

  return (
    <>
      <nav
        style={{
          height: '48px',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border-2)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 24px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/dashboard"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-1)',
              textDecoration: 'none',
            }}
          >
            SEU Playground
          </Link>

          <div
            className="nav-links"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: '13px',
                  color: 'var(--text-2)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  transition: 'color 150ms ease, background 150ms ease',
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div
            className="user-info"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span
              style={{
                color: 'var(--warning)',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {user.points} pts
            </span>
            <span
              style={{
                color: 'var(--text-2)',
                fontSize: '13px',
              }}
            >
              {user.name}
            </span>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-2)',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'color 150ms ease, background 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-1)';
                e.currentTarget.style.background = 'var(--surface-2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-2)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Logout
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-2)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '48px',
            left: 0,
            right: 0,
            background: 'var(--bg)',
            borderBottom: '1px solid var(--border-2)',
            padding: '8px',
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'block',
                padding: '8px 16px',
                fontSize: '13px',
                color: 'var(--text-2)',
                textDecoration: 'none',
                borderRadius: '6px',
              }}
            >
              {link.label}
            </Link>
          ))}
          <div
            style={{
              padding: '8px 16px',
              borderTop: '1px solid var(--border-2)',
              marginTop: '8px',
            }}
          >
            <div style={{ color: 'var(--text-2)', fontSize: '13px', marginBottom: '8px' }}>
              {user.points} pts
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: '13px', marginBottom: '8px' }}>
              {user.name}
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-2)',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .nav-links, .user-info { display: none !important; }
          nav button { display: block !important; }
        }
      `}</style>
    </>
  );
}