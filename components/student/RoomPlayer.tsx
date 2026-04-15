"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useToast } from "./Toast";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

type Difficulty = "EASY" | "MEDIUM" | "HARD";

interface Hint {
  id: string;
  taskId: string;
  content: string;
  pointCost: number;
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

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: "ROOM";
  difficulty: Difficulty;
  points: number;
  dockerImage: string | null;
  templateConfig: unknown;
  isPublished: boolean;
  createdAt: string;
}

interface Progress {
  status: string;
  completedTaskIds: string[];
}

export interface RoomPlayerProps {
  challenge: Challenge;
  tasks: Task[];
  progress: Progress | null;
}

interface HintState {
  [hintId: string]: { revealed: boolean; content: string };
}

export default function RoomPlayer({ challenge, tasks, progress }: RoomPlayerProps) {
  const { show } = useToast();
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    tasks.find((t) => !progress?.completedTaskIds.includes(t.id))?.id || tasks[0]?.id || ""
  );
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(progress?.completedTaskIds || [])
  );
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [hintStates, setHintStates] = useState<HintState>({});
  const [totalPoints, setTotalPoints] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);
  const selectedTask = sortedTasks.find((t) => t.id === selectedTaskId);

  const renderedHtml = selectedTask
    ? DOMPurify.sanitize(marked.parse(selectedTask.question) as string)
    : "";

  const handleSubmit = useCallback(async () => {
    if (!answer.trim() || !selectedTaskId || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const token = localStorage.getItem("seu_access_token") || "";
      const res = await fetch(`/api/challenges/${challenge.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answer: answer.trim(), taskId: selectedTaskId }),
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("Retry-After") || "30", 10);
        setRetryCountdown(retryAfter);
        setErrorMessage(`Rate limited. Try again in ${retryAfter}s`);
        setIsSubmitting(false);

        let count = retryAfter;
        countdownRef.current = setInterval(() => {
          count--;
          setRetryCountdown(count);
          if (count <= 0 && countdownRef.current) {
            clearInterval(countdownRef.current);
            setRetryCountdown(null);
          }
        }, 1000);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setErrorMessage(data.error || "Incorrect answer");
        setShakeInput(true);
        setTimeout(() => setShakeInput(false), 500);
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      setCompletedIds((prev) => new Set([...prev, selectedTaskId]));
      setTotalPoints((prev) => prev + (data.pointsAwarded || 0));
      show(`Correct! +${data.pointsAwarded} points`, "success");
      setAnswer("");
      setErrorMessage(null);

      const nextTask = sortedTasks.find(
        (t) => !completedIds.has(t.id) && t.id !== selectedTaskId
      );
      if (nextTask) {
        setSelectedTaskId(nextTask.id);
      }
    } catch {
      setErrorMessage("Network error. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [answer, selectedTaskId, isSubmitting, challenge.id, completedIds, sortedTasks, show]);

  const handleRevealHint = async (hint: Hint) => {
    try {
      const token = localStorage.getItem("seu_access_token") || "";
      const res = await fetch(`/api/challenges/${challenge.id}/hints/${hint.id}/reveal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        show(data.error || "Failed to reveal hint", "error");
        return;
      }

      const data = await res.json();
      setHintStates((prev) => ({
        ...prev,
        [hint.id]: { revealed: true, content: data.content },
      }));
    } catch {
      show("Failed to reveal hint", "error");
    }
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const containerStyle: React.CSSProperties = {
    display: "flex",
    height: "100vh",
    margin: "-32px -24px -24px",
  };

  const taskListStyle: React.CSSProperties = {
    width: "240px",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    background: "var(--surface)",
  };

  const taskListHeaderStyle: React.CSSProperties = {
    padding: "16px",
    borderBottom: "1px solid var(--border)",
  };

  const taskListTitleStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--text-1)",
    marginBottom: "8px",
  };

  const taskListMetaStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const pointsEarnedStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "var(--success)",
  };

  const taskItemsStyle: React.CSSProperties = {
    flex: 1,
    overflowY: "auto",
  };

  const taskItemStyle = (isCompleted: boolean, isActive: boolean): React.CSSProperties => ({
    padding: "8px 16px",
    fontSize: "13px",
    cursor: "pointer",
    color: isCompleted ? "var(--success)" : isActive ? "var(--text-1)" : "var(--text-2)",
    background: isActive ? "var(--surface)" : "transparent",
    borderRight: isActive ? "2px solid var(--primary)" : "2px solid transparent",
    transition: "background 150ms ease, color 150ms ease, border-color 150ms ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  });

  const taskOrderStyle: React.CSSProperties = {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    flexShrink: 0,
  };

  const mainAreaStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };

  const mainContentStyle: React.CSSProperties = {
    flex: 1,
    overflowY: "auto",
    padding: "24px 32px",
  };

  const questionStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "20px",
  };

  const questionProseStyle: React.CSSProperties = {
    color: "var(--text-1)",
    lineHeight: 1.6,
  };

  const submitRowStyle: React.CSSProperties = {
    display: "flex",
    gap: "8px",
    padding: "16px 32px",
    borderTop: "1px solid var(--border)",
    background: "var(--surface)",
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: "var(--bg)",
    border: `1px solid ${shakeInput ? "var(--accent)" : "var(--border)"}`,
    borderRadius: "6px",
    color: "var(--text-1)",
    fontSize: "14px",
    padding: "10px 14px",
    outline: "none",
  };

  const buttonStyle: React.CSSProperties = {
    width: "100px",
  };

  const errorStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--accent)",
    marginTop: "8px",
  };

  const hintsContainerStyle: React.CSSProperties = {
    marginTop: "20px",
  };

  const showHintsLinkStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-3)",
    cursor: "pointer",
    marginBottom: "12px",
    display: "inline-block",
  };

  const hintItemStyle: React.CSSProperties = {
    marginBottom: "8px",
  };

  const hintCostStyle: React.CSSProperties = {
    marginRight: "8px",
  };

  const revealedHintStyle: React.CSSProperties = {
    background: "var(--surface-2)",
    padding: "10px 12px",
    borderRadius: "6px",
    fontSize: "13px",
    color: "var(--text-1)",
    marginTop: "8px",
  };

  return (
    <div style={containerStyle}>
      <div style={taskListStyle}>
        <div style={taskListHeaderStyle}>
          <div style={taskListTitleStyle}>{challenge.title}</div>
          <div style={taskListMetaStyle}>
            <Badge variant="room">ROOM</Badge>
            {totalPoints > 0 && (
              <span style={pointsEarnedStyle}>+{totalPoints} pts</span>
            )}
          </div>
        </div>
        <div style={taskItemsStyle}>
          {sortedTasks.map((task) => {
            const isCompleted = completedIds.has(task.id);
            const isActive = task.id === selectedTaskId;
            return (
              <div
                key={task.id}
                style={taskItemStyle(isCompleted, isActive)}
                onClick={() => {
                  setSelectedTaskId(task.id);
                  setAnswer("");
                  setErrorMessage(null);
                }}
              >
                <div
                  style={{
                    ...taskOrderStyle,
                    background: isCompleted
                      ? "var(--success)"
                      : isActive
                      ? "var(--primary)"
                      : "var(--border)",
                    color: isCompleted || isActive ? "var(--bg)" : "var(--text-2)",
                  }}
                >
                  {isCompleted ? "✓" : task.order}
                </div>
                <span style={{ flex: 1 }}>Task {task.order}</span>
                <span style={{ fontSize: "11px", color: "var(--text-3)" }}>
                  {task.points} pts
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={mainAreaStyle}>
        <div style={mainContentStyle}>
          {selectedTask && (
            <>
              <div style={questionStyle}>
                <div
                  style={questionProseStyle}
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              </div>

              {retryCountdown !== null && (
                <div style={{ ...errorStyle, color: "var(--warning)" }}>
                  Try again in {retryCountdown}s
                </div>
              )}

              <div>
                <div style={submitRowStyle}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSubmit();
                    }}
                    placeholder="Enter your answer..."
                    style={inputStyle}
                    disabled={isSubmitting || retryCountdown !== null}
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || retryCountdown !== null || !answer.trim()}
                    loading={isSubmitting}
                    style={buttonStyle}
                  >
                    {retryCountdown !== null ? `${retryCountdown}s` : "Submit"}
                  </Button>
                </div>
                {errorMessage && <div style={errorStyle}>{errorMessage}</div>}
              </div>

              {selectedTask.hints.length > 0 && (
                <div style={hintsContainerStyle}>
                  <div
                    style={showHintsLinkStyle}
                    onClick={() => setShowHints(!showHints)}
                  >
                    {showHints ? "Hide hints" : "Show hints"}
                  </div>

                  {showHints && (
                    <>
                      {selectedTask.hints.map((hint) => {
                        const hintState = hintStates[hint.id];
                        if (hintState?.revealed) {
                          return (
                            <div key={hint.id} style={hintItemStyle}>
                              <div style={revealedHintStyle}>
                                {hintState.content}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={hint.id} style={hintItemStyle}>
                            <span style={{ fontSize: "13px", color: "var(--text-2)" }}>
                              Hint · Costs{" "}
                            </span>
                            <Badge variant="medium">{hint.pointCost} pts</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevealHint(hint)}
                              style={{ marginLeft: "8px" }}
                            >
                              Reveal
                            </Button>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}