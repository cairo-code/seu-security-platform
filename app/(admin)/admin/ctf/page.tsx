'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import CTFEventModal from '@/components/admin/CTFEventModal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface CTFEvent {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  isPublished: boolean;
  createdAt: string;
  challengeCount: number;
  teamCount: number;
  status: 'UPCOMING' | 'ACTIVE' | 'ENDED';
}

export default function AdminCTFPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CTFEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CTFEvent | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

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

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/ctf/events', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setEvents(json.events);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole) fetchEvents();
  }, [userRole]);

  const handleDelete = async (eventId: string) => {
    if (!window.confirm('Delete this event? This cannot be undone.')) return;

    const token = localStorage.getItem('token');
    const res = await fetch(`/api/admin/ctf/events/${eventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      fetchEvents();
    } else {
      const json = await res.json();
      alert(json.error || 'Failed to delete event');
    }
  };

  const statusBadgeVariant = (status: string): 'upcoming' | 'active' | 'ended' => {
    switch (status) {
      case 'ACTIVE':
        return 'active';
      case 'ENDED':
        return 'ended';
      default:
        return 'upcoming';
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
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <h1 style={{ fontSize: '20px', fontWeight: 600 }}>CTF Events</h1>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingEvent(null);
                setShowModal(true);
              }}
            >
              New event
            </Button>
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
                  }}>Title</th>
                  <th style={{
                    padding: '10px 12px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--text-2)',
                    textAlign: 'left',
                  }}>Status</th>
                  <th style={{
                    padding: '10px 12px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--text-2)',
                    textAlign: 'left',
                  }}>Start</th>
                  <th style={{
                    padding: '10px 12px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--text-2)',
                    textAlign: 'left',
                  }}>End</th>
                  <th style={{
                    padding: '10px 12px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--text-2)',
                    textAlign: 'left',
                  }}>Challenges</th>
                  <th style={{
                    padding: '10px 12px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--text-2)',
                    textAlign: 'left',
                  }}>Teams</th>
                  <th style={{
                    padding: '10px 12px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--text-2)',
                    textAlign: 'left',
                    width: '120px',
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-2)' }}>
                      Loading...
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-2)' }}>
                      No events found
                    </td>
                  </tr>
                ) : (
                  events.map(event => (
                    <tr key={event.id} style={{ borderBottom: '1px solid var(--border-2)' }}>
                      <td style={{ padding: '10px 12px', fontSize: '13px' }}>{event.title}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge variant={statusBadgeVariant(event.status)}>{event.status}</Badge>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-2)' }}>
                        {new Date(event.startsAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-2)' }}>
                        {new Date(event.endsAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '13px' }}>{event.challengeCount}</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px' }}>{event.teamCount}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingEvent(event);
                              setShowModal(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(event.id)}
                            style={{ color: 'var(--accent)' }}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {showModal && (
            <CTFEventModal
              event={editingEvent}
              onClose={() => {
                setShowModal(false);
                setEditingEvent(null);
              }}
              onSave={() => {
                setShowModal(false);
                setEditingEvent(null);
                fetchEvents();
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}