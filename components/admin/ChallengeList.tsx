'use client';

import { useState, useCallback } from 'react';
import ChallengeBuilderModal from '@/components/admin/ChallengeBuilderModal';
import TaskEditor from '@/components/admin/TaskEditor';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

type ChallengeType = 'ROOM' | 'BOX' | 'CTF';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  difficulty: Difficulty;
  points: number;
  dockerImage: string | null;
  templateConfig: unknown;
  isPublished: boolean;
  createdAt: string;
  _count: {
    tasks: number;
    submissions: number;
  };
}

interface ChallengeListProps {
  initialChallenges: Challenge[];
}

const typeBadgeVariant: Record<ChallengeType, 'room' | 'box' | 'ctf'> = {
  ROOM: 'room',
  BOX: 'box',
  CTF: 'ctf',
};

const difficultyBadgeVariant: Record<Difficulty, 'easy' | 'medium' | 'hard'> = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

export default function ChallengeList({ initialChallenges }: ChallengeListProps) {
  const [challenges, setChallenges] = useState<Challenge[]>(initialChallenges || []);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [publishedFilter, setPublishedFilter] = useState<string>('ALL');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);
  const [showTaskEditor, setShowTaskEditor] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useState(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch {}
    }
  });

  const fetchChallenges = useCallback(async () => {
    const res = await fetch('/api/admin/challenges');
    const data = await res.json();
    setChallenges(data.challenges || []);
  }, []);

  const handleTogglePublish = async (challenge: Challenge) => {
    const newPublished = !challenge.isPublished;
    setChallenges(prev =>
      prev.map(c =>
        c.id === challenge.id ? { ...c, isPublished: newPublished } : c
      )
    );
    try {
      await fetch(`/api/admin/challenges/${challenge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: newPublished }),
      });
    } catch {
      setChallenges(prev =>
        prev.map(c =>
          c.id === challenge.id ? { ...c, isPublished: !newPublished } : c
        )
      );
    }
  };

  const handleDelete = async (challenge: Challenge) => {
    if (!confirm(`Delete "${challenge.title}"?`)) return;
    await fetch(`/api/admin/challenges/${challenge.id}`, { method: 'DELETE' });
    fetchChallenges();
  };

  const handleEdit = async (challenge: Challenge) => {
    const res = await fetch(`/api/admin/challenges/${challenge.id}`);
    const data = await res.json();
    setEditingChallenge(data.challenge);
    setEditingChallengeId(challenge.id);
    setShowTaskEditor(false);
  };

  const handleCloseAll = () => {
    setShowBuilder(false);
    setShowTaskEditor(false);
    setEditingChallenge(null);
    setEditingChallengeId(null);
    fetchChallenges();
  };

  const filtered = challenges.filter(c => {
    if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
    if (publishedFilter === 'YES' && !c.isPublished) return false;
    if (publishedFilter === 'NO' && c.isPublished) return false;
    return true;
  });

  return (
    <div style={{ padding: '32px 0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600 }}>
            Challenges
            <span style={{ marginLeft: '8px', color: 'var(--text-2)', fontWeight: 400 }}>
              ({challenges.length})
            </span>
          </h1>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingChallenge(null);
              setEditingChallengeId(null);
              setShowBuilder(true);
              setShowTaskEditor(false);
            }}
          >
            New challenge
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['ALL', 'ROOM', 'BOX', 'CTF'].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: typeFilter === t ? '2px solid var(--primary)' : '2px solid transparent',
                  color: typeFilter === t ? 'var(--text-1)' : 'var(--text-2)',
                  cursor: 'pointer',
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <select
            value={publishedFilter}
            onChange={e => setPublishedFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-1)',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All</option>
            <option value="YES">Published</option>
            <option value="NO">Unpublished</option>
          </select>
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
                }}>Type</th>
                <th style={{
                  padding: '10px 12px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--text-2)',
                  textAlign: 'left',
                }}>Difficulty</th>
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
                }}>Tasks</th>
                <th style={{
                  padding: '10px 12px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--text-2)',
                  textAlign: 'left',
                }}>Published</th>
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
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-2)' }}>
                  <td style={{ padding: '10px 12px', fontSize: '13px' }}>{c.title}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge variant={typeBadgeVariant[c.type]}>{c.type}</Badge>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge variant={difficultyBadgeVariant[c.difficulty]}>{c.difficulty}</Badge>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '13px' }}>{c.points}</td>
                  <td style={{ padding: '10px 12px', fontSize: '13px' }}>{c._count.tasks}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={c.isPublished}
                        onChange={() => handleTogglePublish(c)}
                        style={{
                          width: '32px',
                          height: '18px',
                          appearance: 'none',
                          background: c.isPublished ? 'var(--success)' : 'var(--border)',
                          borderRadius: '9px',
                          position: 'relative',
                          cursor: 'pointer',
                        }}
                      />
                    </label>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(c)}
                        style={{ color: 'var(--accent)' }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-2)' }}>
                    No challenges found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {showBuilder && (
          <ChallengeBuilderModal onClose={handleCloseAll} />
        )}

        {editingChallengeId && !showTaskEditor && (
          <ChallengeBuilderModal
            challenge={editingChallenge}
            challengeId={editingChallengeId}
            onClose={handleCloseAll}
          />
        )}

        {showTaskEditor && editingChallengeId && (
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
              width: '640px',
              maxHeight: '90vh',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '24px',
              overflow: 'auto',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Edit Tasks</h2>
                <button
                  onClick={handleCloseAll}
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
              <TaskEditor challengeId={editingChallengeId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}