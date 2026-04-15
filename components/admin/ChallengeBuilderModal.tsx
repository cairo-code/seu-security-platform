'use client';

import { useState, FormEvent } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

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
}

interface ChallengeBuilderModalProps {
  onClose: () => void;
  challenge?: Challenge | null;
  challengeId?: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  type?: string;
  difficulty?: string;
  points?: string;
  dockerImage?: string;
  templateConfig?: string;
}

const stepNames = ['', 'Basics', 'Configuration', 'Review'];

export default function ChallengeBuilderModal({
  onClose,
  challenge,
  challengeId,
}: ChallengeBuilderModalProps) {
  const isEdit = !!challenge;
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState(challenge?.title || '');
  const [description, setDescription] = useState(challenge?.description || '');
  const [type, setType] = useState<ChallengeType>(challenge?.type || 'ROOM');
  const [difficulty, setDifficulty] = useState<Difficulty>(challenge?.difficulty || 'EASY');
  const [points, setPoints] = useState(challenge?.points?.toString() || '');
  const [dockerImage, setDockerImage] = useState(challenge?.dockerImage || '');
  const [templateConfig, setTemplateConfig] = useState(
    challenge?.templateConfig ? JSON.stringify(challenge.templateConfig, null, 2) : ''
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [templateConfigError, setTemplateConfigError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const validateStep1 = (): boolean => {
    const e: FormErrors = {};
    if (!title.trim()) e.title = 'Title is required';
    if (!description.trim()) e.description = 'Description is required';
    if (!type) e.type = 'Type is required';
    if (!difficulty) e.difficulty = 'Difficulty is required';
    const pts = parseFloat(points);
    if (!points || isNaN(pts) || pts <= 0) e.points = 'Points must be greater than 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = (): boolean => {
    const e: FormErrors = {};
    if (type === 'BOX' && !dockerImage.trim()) {
      e.dockerImage = 'Docker image is required for BOX challenges';
    }
    if (type === 'CTF' && !dockerImage.trim() && !templateConfig.trim()) {
      e.dockerImage = 'CTF requires either dockerImage or templateConfig';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      type,
      difficulty,
      points: parseFloat(points),
    };

    if (type === 'BOX') {
      body.dockerImage = dockerImage.trim();
    } else if (type === 'CTF') {
      if (dockerImage.trim()) {
        body.dockerImage = dockerImage.trim();
      } else if (templateConfig.trim()) {
        body.templateConfig = JSON.parse(templateConfig);
      }
    }

    try {
      if (isEdit && challengeId) {
        await fetch(`/api/admin/challenges/${challengeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        await fetch('/api/admin/challenges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      onClose();
    } catch {
      setErrors({ title: 'Failed to save challenge' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTemplateConfigBlur = () => {
    if (!templateConfig.trim()) {
      setTemplateConfigError('');
      return;
    }
    try {
      JSON.parse(templateConfig);
      setTemplateConfigError('');
    } catch {
      setTemplateConfigError('Invalid JSON');
    }
  };

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
            {isEdit ? 'Edit Challenge' : 'New Challenge'}
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

        <div style={{ marginBottom: '20px', fontSize: '12px', color: 'var(--text-2)' }}>
          <span>Step {step} of 3</span>
          <span style={{ marginLeft: '8px' }}>{stepNames[step]}</span>
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Input
                label="Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Challenge title"
                error={errors.title}
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
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '7px 12px',
                    fontSize: '14px',
                    background: 'var(--surface)',
                    border: `1px solid ${errors.description ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '6px',
                    color: 'var(--text-1)',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                  placeholder="Challenge description"
                />
                {errors.description && (
                  <p style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '4px' }}>
                    {errors.description}
                  </p>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  color: 'var(--text-2)',
                  marginBottom: '8px',
                }}>
                  Type
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {(['ROOM', 'BOX', 'CTF'] as ChallengeType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      style={{
                        padding: '12px',
                        borderRadius: '6px',
                        border: `1px solid ${type === t ? 'var(--primary)' : 'var(--border)'}`,
                        background: type === t ? 'rgba(88,166,255,0.05)' : 'transparent',
                        color: 'var(--text-1)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  color: 'var(--text-2)',
                  marginBottom: '8px',
                }}>
                  Difficulty
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      style={{
                        padding: '12px',
                        borderRadius: '6px',
                        border: `1px solid ${difficulty === d ? 'var(--primary)' : 'var(--border)'}`,
                        background: difficulty === d ? 'rgba(88,166,255,0.05)' : 'transparent',
                        color: 'var(--text-1)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Points"
                type="number"
                value={points}
                onChange={e => setPoints(e.target.value)}
                placeholder="100"
                error={errors.points}
              />
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {type === 'BOX' && (
                <Input
                  label="Docker Image"
                  value={dockerImage}
                  onChange={e => setDockerImage(e.target.value)}
                  placeholder="seu/box:web-vuln-01"
                  error={errors.dockerImage}
                  hint="Flag is auto-generated per user"
                />
              )}

              {type === 'CTF' && (
                <>
                  <Input
                    label="Docker Image (optional)"
                    value={dockerImage}
                    onChange={e => setDockerImage(e.target.value)}
                    placeholder="seu/ctf:crypto-01"
                  />
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: 'var(--text-2)',
                      marginBottom: '6px',
                    }}>
                      Template Config (JSON) (optional)
                    </label>
                    <textarea
                      value={templateConfig}
                      onChange={e => setTemplateConfig(e.target.value)}
                      onBlur={handleTemplateConfigBlur}
                      style={{
                        width: '100%',
                        padding: '7px 12px',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        background: 'var(--surface)',
                        border: `1px solid ${templateConfigError ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: '6px',
                        color: 'var(--text-1)',
                        outline: 'none',
                        resize: 'vertical',
                        minHeight: '120px',
                      }}
                      placeholder='{\n  "puzzle": "..."\n}'
                    />
                    {templateConfigError && (
                      <p style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '4px' }}>
                        {templateConfigError}
                      </p>
                    )}
                    {errors.dockerImage && (
                      <p style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '4px' }}>
                        {errors.dockerImage}
                      </p>
                    )}
                  </div>
                </>
              )}

              {type === 'ROOM' && (
                <div style={{
                  padding: '12px',
                  background: 'var(--surface-2)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: 'var(--text-2)',
                }}>
                  Tasks will be added after creation.
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '16px',
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Summary</h3>
              <dl style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex' }}>
                  <dt style={{ fontWeight: 500, width: '100px', color: 'var(--text-2)' }}>Title:</dt>
                  <dd>{title}</dd>
                </div>
                <div style={{ display: 'flex' }}>
                  <dt style={{ fontWeight: 500, width: '100px', color: 'var(--text-2)' }}>Description:</dt>
                  <dd style={{ whiteSpace: 'pre-wrap' }}>{description}</dd>
                </div>
                <div style={{ display: 'flex' }}>
                  <dt style={{ fontWeight: 500, width: '100px', color: 'var(--text-2)' }}>Type:</dt>
                  <dd>{type}</dd>
                </div>
                <div style={{ display: 'flex' }}>
                  <dt style={{ fontWeight: 500, width: '100px', color: 'var(--text-2)' }}>Difficulty:</dt>
                  <dd>{difficulty}</dd>
                </div>
                <div style={{ display: 'flex' }}>
                  <dt style={{ fontWeight: 500, width: '100px', color: 'var(--text-2)' }}>Points:</dt>
                  <dd>{points}</dd>
                </div>
                {dockerImage && (
                  <div style={{ display: 'flex' }}>
                    <dt style={{ fontWeight: 500, width: '100px', color: 'var(--text-2)' }}>Docker:</dt>
                    <dd style={{ fontFamily: 'monospace', fontSize: '12px' }}>{dockerImage}</dd>
                  </div>
                )}
                {templateConfig && (
                  <div style={{ display: 'flex' }}>
                    <dt style={{ fontWeight: 500, width: '100px', color: 'var(--text-2)' }}>Config:</dt>
                    <dd>
                      <pre style={{
                        fontSize: '11px',
                        background: 'var(--surface-2)',
                        padding: '8px',
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '100px',
                      }}>
                        {templateConfig}
                      </pre>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border)',
          }}>
            {step > 1 ? (
              <Button variant="secondary" size="sm" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
            )}
            {step < 3 ? (
              <Button variant="primary" size="sm" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleSubmit} loading={submitting}>
                {submitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}