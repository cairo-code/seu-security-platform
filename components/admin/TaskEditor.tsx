'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/Button';

interface Hint {
  id: string;
  content: string;
  pointCost: number;
  taskId: string;
}

interface Task {
  id: string;
  challengeId: string;
  order: number;
  question: string;
  answer: string;
  points: number;
  hints: Hint[];
}

interface TaskEditorProps {
  challengeId: string;
}

export default function TaskEditor({ challengeId }: TaskEditorProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newPoints, setNewPoints] = useState('');
  const [newTaskErrors, setNewTaskErrors] = useState<Record<string, string>>({});
  const [showHintForm, setShowHintForm] = useState<string | null>(null);
  const [hintContent, setHintContent] = useState('');
  const [hintPointCost, setHintPointCost] = useState('');
  const [hintError, setHintError] = useState('');
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [shownAnswers, setShownAnswers] = useState<Set<string>>(new Set());

  const fetchTasks = useCallback(async () => {
    const res = await fetch(`/api/admin/challenges/${challengeId}`);
    const data = await res.json();
    setTasks(data.challenge?.tasks || []);
    setLoading(false);
  }, [challengeId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleAnswerShow = (taskId: string) => {
    setShownAnswers(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleAddTask = async () => {
    const errors: Record<string, string> = {};
    if (!newQuestion.trim()) errors.question = 'Required';
    if (!newAnswer.trim()) errors.answer = 'Required';
    const pts = parseFloat(newPoints);
    if (!newPoints || isNaN(pts) || pts <= 0) errors.points = 'Must be > 0';

    if (Object.keys(errors).length > 0) {
      setNewTaskErrors(errors);
      return;
    }

    const maxOrder = tasks.reduce((max, t) => Math.max(max, t.order), -1);

    try {
      const res = await fetch(`/api/admin/challenges/${challengeId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
          points: pts,
          order: maxOrder + 1,
        }),
      });
      const data = await res.json();
      if (data.task) {
        setTasks(prev => [...prev, data.task]);
        setNewQuestion('');
        setNewAnswer('');
        setNewPoints('');
        setNewTaskErrors({});
        setShowAddTask(false);
      }
    } catch {
      setNewTaskErrors({ general: 'Failed to create task' });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task and its hints?')) return;
    await fetch(`/api/admin/challenges/${challengeId}/tasks/${taskId}`, {
      method: 'DELETE',
    });
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleUpdateTask = async (taskId: string, field: string, value: unknown) => {
    await fetch(`/api/admin/challenges/${challengeId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, [field]: value } : t))
    );
  };

  const handleAddHint = async (taskId: string) => {
    const content = hintContent.trim();
    const cost = parseFloat(hintPointCost);

    if (!content) {
      setHintError('Hint content is required');
      return;
    }
    if (isNaN(cost) || cost <= 0) {
      setHintError('Point cost must be greater than 0');
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/challenges/${challengeId}/tasks/${taskId}/hints`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, pointCost: cost }),
        }
      );
      const data = await res.json();
      if (data.hint) {
        setTasks(prev =>
          prev.map(t =>
            t.id === taskId ? { ...t, hints: [...t.hints, data.hint] } : t
          )
        );
        setHintContent('');
        setHintPointCost('');
        setHintError('');
        setShowHintForm(null);
      }
    } catch {
      setHintError('Failed to create hint');
    }
  };

  const handleDeleteHint = async (taskId: string, hintId: string) => {
    await fetch(
      `/api/admin/challenges/${challengeId}/tasks/${taskId}/hints`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hintId }),
      }
    );
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, hints: t.hints.filter(h => h.id !== hintId) }
          : t
      )
    );
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    if (draggedTask && draggedTask !== taskId) {
      setTasks(prev => {
        const draggedIndex = prev.findIndex(t => t.id === draggedTask);
        const targetIndex = prev.findIndex(t => t.id === taskId);
        if (draggedIndex === -1 || targetIndex === -1) return prev;
        const updated = [...prev];
        const [removed] = updated.splice(draggedIndex, 1);
        updated.splice(targetIndex, 0, removed);
        return updated;
      });
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedTask(null);

    const reordered = tasks.map((t, i) => ({ id: t.id, order: i }));
    try {
      await fetch(`/api/admin/challenges/${challengeId}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: reordered }),
      });
    } catch {
      fetchTasks();
    }
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-2)' }}>Loading tasks...</div>;
  }

  return (
    <div>
      {tasks.map(task => (
        <div
          key={task.id}
          draggable
          onDragStart={() => handleDragStart(task.id)}
          onDragOver={e => handleDragOver(e, task.id)}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          style={{
            borderBottom: '1px solid var(--border)',
            opacity: draggedTask === task.id ? 0.5 : 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 0',
              cursor: 'pointer',
            }}
            onClick={() => toggleExpand(task.id)}
          >
            <span style={{ color: 'var(--text-3)', cursor: 'grab', fontSize: '14px' }}>⋮⋮</span>
            <span style={{ flex: 1, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.question}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-2)', marginRight: '8px' }}>
              {task.points} pts
            </span>
            <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleExpand(task.id); }}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteTask(task.id); }}
              style={{ color: 'var(--accent)' }}
            >
              Delete
            </Button>
          </div>

          {expandedTasks.has(task.id) && (
            <div style={{ paddingBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  color: 'var(--text-2)',
                  marginBottom: '6px',
                }}>
                  Answer
                </label>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                }}>
                  <input
                    type={shownAnswers.has(task.id) ? 'text' : 'password'}
                    value={task.answer}
                    onChange={e => handleUpdateTask(task.id, 'answer', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text-1)',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleAnswerShow(task.id)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text-1)',
                      cursor: 'pointer',
                    }}
                  >
                    {shownAnswers.has(task.id) ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {task.hints.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>Hints</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {task.hints.map(hint => (
                      <div
                        key={hint.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          padding: '8px',
                          background: 'var(--surface-2)',
                          borderRadius: '4px',
                        }}
                      >
                        <div>
                          <p style={{ fontSize: '13px' }}>{hint.content}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px' }}>
                            -{hint.pointCost} pts
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteHint(task.id, hint.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '12px',
                            color: 'var(--accent)',
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setShowHintForm(showHintForm === task.id ? null : task.id);
                    setHintError('');
                  }}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--text-1)',
                    cursor: 'pointer',
                  }}
                >
                  Add hint
                </button>
              </div>

              {showHintForm === task.id && (
                <div style={{
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: 'var(--text-2)',
                      marginBottom: '4px',
                    }}>
                      Hint Content
                    </label>
                    <textarea
                      value={hintContent}
                      onChange={e => setHintContent(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '13px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: 'var(--text-1)',
                        outline: 'none',
                        resize: 'vertical',
                        minHeight: '60px',
                      }}
                      placeholder="Hint text..."
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: 'var(--text-2)',
                      marginBottom: '4px',
                    }}>
                      Point Cost
                    </label>
                    <input
                      type="number"
                      value={hintPointCost}
                      onChange={e => setHintPointCost(e.target.value)}
                      style={{
                        width: '80px',
                        padding: '6px 8px',
                        fontSize: '13px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: 'var(--text-1)',
                        outline: 'none',
                      }}
                      min="1"
                    />
                  </div>
                  {hintError && (
                    <p style={{ fontSize: '12px', color: 'var(--accent)' }}>{hintError}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAddHint(task.id)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      background: 'var(--primary)',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                      cursor: 'pointer',
                      alignSelf: 'flex-start',
                    }}
                  >
                    Save Hint
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {showAddTask ? (
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '16px',
          marginTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600 }}>New Task</h3>
          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--text-2)',
              marginBottom: '4px',
            }}>
              Question
            </label>
            <textarea
              value={newQuestion}
              onChange={e => {
                setNewQuestion(e.target.value);
                setNewTaskErrors(prev => ({ ...prev, question: '' }));
              }}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '13px',
                background: 'var(--surface)',
                border: `1px solid ${newTaskErrors.question ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '4px',
                color: 'var(--text-1)',
                outline: 'none',
                resize: 'vertical',
                minHeight: '80px',
              }}
              placeholder="Task question..."
            />
            {newTaskErrors.question && (
              <p style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '4px' }}>{newTaskErrors.question}</p>
            )}
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--text-2)',
              marginBottom: '4px',
            }}>
              Answer
            </label>
            <input
              type="text"
              value={newAnswer}
              onChange={e => {
                setNewAnswer(e.target.value);
                setNewTaskErrors(prev => ({ ...prev, answer: '' }));
              }}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '13px',
                fontFamily: 'monospace',
                background: 'var(--surface)',
                border: `1px solid ${newTaskErrors.answer ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '4px',
                color: 'var(--text-1)',
                outline: 'none',
              }}
              placeholder="Task answer..."
            />
            {newTaskErrors.answer && (
              <p style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '4px' }}>{newTaskErrors.answer}</p>
            )}
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--text-2)',
              marginBottom: '4px',
            }}>
              Points
            </label>
            <input
              type="number"
              value={newPoints}
              onChange={e => {
                setNewPoints(e.target.value);
                setNewTaskErrors(prev => ({ ...prev, points: '' }));
              }}
              style={{
                width: '100px',
                padding: '6px 10px',
                fontSize: '13px',
                background: 'var(--surface)',
                border: `1px solid ${newTaskErrors.points ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '4px',
                color: 'var(--text-1)',
                outline: 'none',
              }}
              min="1"
            />
            {newTaskErrors.points && (
              <p style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '4px' }}>{newTaskErrors.points}</p>
            )}
          </div>
          {newTaskErrors.general && (
            <p style={{ fontSize: '12px', color: 'var(--accent)' }}>{newTaskErrors.general}</p>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="primary" size="sm" onClick={handleAddTask}>
              Create Task
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowAddTask(false);
                setNewQuestion('');
                setNewAnswer('');
                setNewPoints('');
                setNewTaskErrors({});
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '16px' }}>
          <Button variant="secondary" size="sm" onClick={() => setShowAddTask(true)}>
            Add task
          </Button>
        </div>
      )}
    </div>
  );
}