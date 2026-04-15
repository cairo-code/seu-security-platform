import { verifyRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { containerClient } from '@/lib/containerClient';
import AdminSidebar from '@/components/admin/AdminSidebar';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { cookies } from 'next/headers';

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('seu_access_token')?.value;

  if (!accessToken) {
    return (
      <div style={{ display: 'flex' }}>
        <AdminSidebar />
        <main style={{ flex: 1, padding: '24px' }}>
          <div style={{ padding: '24px', color: 'var(--accent)' }}>Unauthorized. Admin or Teacher access required.</div>
        </main>
      </div>
    );
  }

  let auth;
  let authError = 'Unknown error';
  try {
    auth = await verifyRole(accessToken, 'ADMIN', 'TEACHER');
  } catch (e) {
    authError = e instanceof Error ? e.message : String(e);
    return (
      <div style={{ display: 'flex' }}>
        <AdminSidebar />
        <main style={{ flex: 1, padding: '24px' }}>
          <div style={{ padding: '24px', color: 'var(--accent)' }}>
            Unauthorized. Admin or Teacher access required.
            <br />
            <small>Error: {authError}</small>
          </div>
        </main>
      </div>
    );
  }

  let containerStatus = { running: 0, max: 10 };
  try {
    containerStatus = await containerClient.getStatus();
  } catch {
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [totalUsers, totalChallenges, submissionsToday, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.challenge.count(),
    prisma.submission.count({
      where: { submittedAt: { gte: todayStart } },
    }),
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        universityId: true,
        role: true,
        createdAt: true,
      },
    }),
  ]);

  const quickLinks = [
    { href: '/admin/challenges', label: 'Challenges' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/ctf', label: 'CTF Events' },
    { href: '/admin/system', label: 'System Config' },
  ];

  return (
    <div style={{ display: 'flex' }}>
      <AdminSidebar />
      <main style={{ flex: 1, padding: '32px 0', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: 600,
            borderBottom: '1px solid var(--border)',
            paddingBottom: '16px',
            marginBottom: '24px',
          }}>
            Dashboard
          </h1>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '32px',
          }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 600 }}>{totalUsers}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>Total users</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 600 }}>{totalChallenges}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>Challenges</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 600 }}>{containerStatus.running}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>Active containers</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 600 }}>{submissionsToday}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>Submissions today</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '32px' }}>
            <div>
              <h2 style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
              }}>
                Recent registrations
              </h2>
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{
                        padding: '10px 12px',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: 'var(--text-2)',
                        textAlign: 'left',
                      }}>Name</th>
                      <th style={{
                        padding: '10px 12px',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: 'var(--text-2)',
                        textAlign: 'left',
                      }}>University ID</th>
                      <th style={{
                        padding: '10px 12px',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: 'var(--text-2)',
                        textAlign: 'left',
                      }}>Role</th>
                      <th style={{
                        padding: '10px 12px',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: 'var(--text-2)',
                        textAlign: 'left',
                      }}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map(user => (
                      <tr key={user.id} style={{ borderBottom: '1px solid var(--border-2)' }}>
                        <td style={{ padding: '10px 12px', fontSize: '13px' }}>{user.name}</td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', fontFamily: 'monospace' }}>{user.universityId}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <Badge variant={user.role.toLowerCase() as 'admin' | 'teacher' | 'student'}>{user.role}</Badge>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-2)' }}>
                          {user.createdAt.toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {recentUsers.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-2)', fontSize: '13px' }}>
                          No recent registrations
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
              }}>
                Quick actions
              </h2>
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
              }}>
                {quickLinks.map((link, idx) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      display: 'block',
                      padding: '10px 12px',
                      fontSize: '13px',
                      color: 'var(--primary)',
                      borderBottom: idx < quickLinks.length - 1 ? '1px solid var(--border-2)' : 'none',
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}