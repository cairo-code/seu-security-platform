'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/challenges', label: 'Challenges' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/ctf', label: 'CTF Events' },
  { href: '/admin/system', label: 'System' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: '220px',
        background: 'var(--bg)',
        borderRight: '1px solid var(--border-2)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        padding: '16px 0',
      }}
    >
      <div
        style={{
          padding: '0 16px 16px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-1)',
          borderBottom: '1px solid var(--border-2)',
        }}
      >
        SEU Playground
      </div>

      <nav style={{ marginTop: '8px' }}>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-3)',
            padding: '16px 16px 6px',
          }}
        >
          Admin
        </div>

        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 16px',
                fontSize: '13px',
                color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                background: isActive ? 'var(--surface)' : 'transparent',
                borderRight: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                textDecoration: 'none',
                transition: 'background 150ms ease, color 150ms ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--surface-2)';
                  e.currentTarget.style.color = 'var(--text-1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-2)';
                }
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}