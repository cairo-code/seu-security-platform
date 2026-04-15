'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import Badge from '@/components/ui/Badge';

interface User {
  id: string;
  name: string;
  universityId: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  points: number;
  createdAt: string;
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
        if (payload.role !== 'ADMIN' && payload.role !== 'TEACHER') {
          router.push('/dashboard');
        }
      } catch {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/users?page=${page}&limit=20&search=${encodeURIComponent(debouncedSearch)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    if (userRole) fetchUsers();
  }, [fetchUsers, userRole]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!window.confirm(`Change role to ${newRole}?`)) return;

    const token = localStorage.getItem('token');
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role: newRole }),
    });

    if (res.ok) {
      fetchUsers();
    } else {
      const json = await res.json();
      alert(json.error || 'Failed to update role');
    }
  };

  if (!userRole) {
    return (
      <div style={{ display: 'flex' }}>
        <AdminSidebar />
        <main style={{ flex: 1, padding: '24px' }}>Loading...</main>
      </div>
    );
  }

  const roleBadgeVariant = (role: string): 'admin' | 'teacher' | 'student' => {
    return role.toLowerCase() as 'admin' | 'teacher' | 'student';
  };

  return (
    <div style={{ display: 'flex' }}>
      <AdminSidebar />
      <main style={{ flex: 1, padding: '32px 0', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <h1 style={{ fontSize: '20px', fontWeight: 600 }}>
              Users
              {data && (
                <span style={{ marginLeft: '8px', color: 'var(--text-2)', fontWeight: 400 }}>
                  ({data.pagination.total})
                </span>
              )}
            </h1>
            <input
              type="text"
              placeholder="Search by name or university ID..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                width: '280px',
                padding: '6px 12px',
                fontSize: '13px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-1)',
                outline: 'none',
              }}
            />
          </div>

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
                    width: '60px',
                  }}>#</th>
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
                  }}>Email</th>
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
                  }}>Points</th>
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
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-2)' }}>
                      Loading...
                    </td>
                  </tr>
                ) : data?.users.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-2)' }}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  data?.users.map((user, idx) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border-2)' }}>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text-2)' }}>
                        {(data.pagination.page - 1) * data.pagination.limit + idx + 1}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '13px' }}>{user.name}</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', fontFamily: 'monospace' }}>
                        {user.universityId}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '13px' }}>{user.email}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {userRole === 'ADMIN' ? (
                          <select
                            value={user.role}
                            onChange={e => handleRoleChange(user.id, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              background: 'var(--surface-2)',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                              color: 'var(--text-1)',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="STUDENT">STUDENT</option>
                            <option value="TEACHER">TEACHER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        ) : (
                          <Badge variant={roleBadgeVariant(user.role)}>{user.role}</Badge>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '13px' }}>{user.points}</td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-2)' }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.pagination.totalPages > 1 && (
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: page === 1 ? 'var(--text-3)' : 'var(--text-1)',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              <span style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--text-2)' }}>
                Page {page} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: page === data.pagination.totalPages ? 'var(--text-3)' : 'var(--text-1)',
                  cursor: page === data.pagination.totalPages ? 'not-allowed' : 'pointer',
                  opacity: page === data.pagination.totalPages ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}