'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface CTFEvent {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  isPublished: boolean;
}

interface Challenge {
  id: string;
  title: string;
  points: number;
}

interface CTFEventModalProps {
  event: CTFEvent | null;
  onClose: () => void;
  onSave: () => void;
}

export default function CTFEventModal({ event, onClose, onSave }: CTFEventModalProps) {
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [startsAt, setStartsAt] = useState(
    event?.startsAt ? new Date(event.startsAt).toISOString().slice(0, 16) : ''
  );
  const [endsAt, setEndsAt] = useState(
    event?.endsAt ? new Date(event.endsAt).toISOString().slice(0, 16) : ''
  );
  const [saving, setSaving] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [eventChallenges, setEventChallenges] = useState<Challenge[]>([]);
  const [challengeSearch, setChallengeSearch] = useState('');

  const isEdit = !!event;

  useEffect(() => {
    if (isEdit) {
      fetchEventChallenges();
      fetchChallenges();
    }
  }, [isEdit]);

  const fetchEventChallenges = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/ctf/events/${event!.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setEventChallenges(json.challenges || []);
    }
  };

  const fetchChallenges = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/admin/challenges?type=CTF&published=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setChallenges(json.challenges || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !startsAt || !endsAt) {
      alert('Please fill in all required fields');
      return;
    }

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);
    const now = new Date();

    if (!isEdit && (startDate <= now || endDate <= now)) {
      alert('Dates must be in the future for new events');
      return;
    }

    if (endDate <= startDate) {
      alert('End date must be after start date');
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const url = isEdit
        ? `/api/ctf/events/${event.id}`
        : '/api/ctf/events';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description,
          startsAt: startDate.toISOString(),
          endsAt: endDate.toISOString(),
        }),
      });

      if (res.ok) {
        onSave();
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to save event');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddChallenge = async (challengeId: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/ctf/events/${event!.id}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ challengeId }),
    });

    if (res.ok) {
      fetchEventChallenges();
    }
  };

  const handleRemoveChallenge = async (challengeId: string) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/ctf/events/${event!.id}/challenges`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ challengeId }),
    });
    fetchEventChallenges();
  };

  const availableChallenges = challenges.filter(
    c => !eventChallenges.some(ec => ec.id === c.id)
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
    }}>
      <div style={{
        width: '560px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '24px',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '16px',
          marginBottom: '20px',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>
            {isEdit ? 'Edit Event' : 'New Event'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              color: 'var(--text-2)',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Title *"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />

          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--text-2)',
              marginBottom: '6px',
            }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '7px 12px',
                fontSize: '14px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-1)',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Start Time *"
              type="datetime-local"
              value={startsAt}
              onChange={e => setStartsAt(e.target.value)}
              required
            />
            <Input
              label="End Time *"
              type="datetime-local"
              value={endsAt}
              onChange={e => setEndsAt(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={saving}
              style={{ flex: 1 }}
            >
              {saving ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </form>

        {isEdit && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Challenges</h3>

            {eventChallenges.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '8px' }}>Current challenges</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {eventChallenges.map(c => (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px',
                        background: 'var(--surface-2)',
                        borderRadius: '4px',
                      }}
                    >
                      <span style={{ fontSize: '13px' }}>{c.title} ({c.points} pts)</span>
                      <button
                        onClick={() => handleRemoveChallenge(c.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '12px',
                          color: 'var(--accent)',
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '8px' }}>Add challenges</p>
              <input
                type="text"
                placeholder="Search challenges..."
                value={challengeSearch}
                onChange={e => setChallengeSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '13px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text-1)',
                  outline: 'none',
                  marginBottom: '8px',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflow: 'auto' }}>
                {availableChallenges
                  .filter(c =>
                    c.title.toLowerCase().includes(challengeSearch.toLowerCase())
                  )
                  .map(c => (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      <span style={{ fontSize: '12px' }}>
                        {c.title} ({c.points} pts)
                      </span>
                      <button
                        onClick={() => handleAddChallenge(c.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '12px',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                        }}
                      >
                        Add
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}