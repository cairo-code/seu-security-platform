'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import Button from '@/components/ui/Button';

interface SystemConfig {
  id: number;
  maxConcurrentContainers: number;
  rateLimitAttempts: number;
  rateLimitWindowMinutes: number;
  containerTimeoutMinutes: number;
}

interface SystemStatus {
  running: number;
  max: number;
  totalUsers: number;
  totalChallenges: number;
  submissionsToday: number;
}

export default function AdminSystemPage() {
  const router = useRouter();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [maxConcurrentContainers, setMaxConcurrentContainers] = useState(10);
  const [rateLimitAttempts, setRateLimitAttempts] = useState(3);
  const [rateLimitWindowMinutes, setRateLimitWindowMinutes] = useState(10);
  const [containerTimeoutMinutes, setContainerTimeoutMinutes] = useState(30);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      const [configRes, statusRes] = await Promise.all([
        fetch('/api/admin/system/config', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/system/status', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (configRes.ok) {
        const cfg = await configRes.json();
        setConfig(cfg);
        setMaxConcurrentContainers(cfg.maxConcurrentContainers);
        setRateLimitAttempts(cfg.rateLimitAttempts);
        setRateLimitWindowMinutes(cfg.rateLimitWindowMinutes);
        setContainerTimeoutMinutes(cfg.containerTimeoutMinutes);
      }

      if (statusRes.ok) {
        setStatus(await statusRes.json());
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole) fetchData();
  }, [userRole]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/system/config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          maxConcurrentContainers,
          rateLimitAttempts,
          rateLimitWindowMinutes,
          containerTimeoutMinutes,
        }),
      });

      if (res.ok) {
        const cfg = await res.json();
        setConfig(cfg);
        alert('Configuration saved');
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to save configuration');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleForceDestroy = async () => {
    if (!window.confirm('Force destroy all running containers? This will terminate all active sessions.')) return;

    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/system/containers', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const json = await res.json();
      alert(`Destroyed ${json.destroyed} containers`);
      fetchData();
    } else {
      const json = await res.json();
      alert(json.error || 'Failed to destroy containers');
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

  return (
    <div style={{ display: 'flex' }}>
      <AdminSidebar />
      <main style={{ flex: 1, padding: '32px 0', minHeight: '100vh' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: 600,
            borderBottom: '1px solid var(--border)',
            paddingBottom: '16px',
            marginBottom: '24px',
          }}>
            System config
          </h1>

          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-2)' }}>Loading...</div>
          ) : (
            <>
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 0',
                  borderBottom: '1px solid var(--border-2)',
                }}>
                  <div>
                    <div style={{ fontSize: '13px' }}>Max Concurrent Containers</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                      Maximum number of containers that can run simultaneously
                    </div>
                  </div>
                  <input
                    type="number"
                    value={maxConcurrentContainers}
                    onChange={e => setMaxConcurrentContainers(parseInt(e.target.value) || 0)}
                    min={1}
                    style={{
                      width: '80px',
                      padding: '6px 10px',
                      fontSize: '13px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text-1)',
                      outline: 'none',
                      textAlign: 'right',
                    }}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 0',
                  borderBottom: '1px solid var(--border-2)',
                }}>
                  <div>
                    <div style={{ fontSize: '13px' }}>Container Timeout</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                      Auto-destroy containers after this idle time (minutes)
                    </div>
                  </div>
                  <input
                    type="number"
                    value={containerTimeoutMinutes}
                    onChange={e => setContainerTimeoutMinutes(parseInt(e.target.value) || 0)}
                    min={1}
                    style={{
                      width: '80px',
                      padding: '6px 10px',
                      fontSize: '13px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text-1)',
                      outline: 'none',
                      textAlign: 'right',
                    }}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 0',
                  borderBottom: '1px solid var(--border-2)',
                }}>
                  <div>
                    <div style={{ fontSize: '13px' }}>Rate Limit Attempts</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                      Number of submission attempts allowed per window
                    </div>
                  </div>
                  <input
                    type="number"
                    value={rateLimitAttempts}
                    onChange={e => setRateLimitAttempts(parseInt(e.target.value) || 0)}
                    min={1}
                    style={{
                      width: '80px',
                      padding: '6px 10px',
                      fontSize: '13px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text-1)',
                      outline: 'none',
                      textAlign: 'right',
                    }}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 0',
                }}>
                  <div>
                    <div style={{ fontSize: '13px' }}>Rate Limit Window</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                      Time window for rate limiting (minutes)
                    </div>
                  </div>
                  <input
                    type="number"
                    value={rateLimitWindowMinutes}
                    onChange={e => setRateLimitWindowMinutes(parseInt(e.target.value) || 0)}
                    min={1}
                    style={{
                      width: '80px',
                      padding: '6px 10px',
                      fontSize: '13px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text-1)',
                      outline: 'none',
                      textAlign: 'right',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>

              <div style={{
                marginTop: '32px',
                paddingTop: '24px',
                borderTop: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
                  Running containers: {status?.running || 0} / {status?.max || 0}
                </div>

                {userRole === 'ADMIN' && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleForceDestroy}
                  >
                    Force destroy all
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}