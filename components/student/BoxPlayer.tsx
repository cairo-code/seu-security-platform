"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useToast } from "./Toast";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const Terminal = dynamic(() => import("@/components/Terminal"), { ssr: false });

type Difficulty = "EASY" | "MEDIUM" | "HARD";

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: "BOX";
  difficulty: Difficulty;
  points: number;
  dockerImage: string | null;
  templateConfig: unknown;
  isPublished: boolean;
  createdAt: string;
}

interface Progress {
  status: string;
}

export interface BoxPlayerProps {
  challenge: Challenge;
  progress: Progress | null;
}

export default function BoxPlayer({ challenge, progress }: BoxPlayerProps) {
  const { show } = useToast();
  const [flag, setFlag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(progress?.status === "COMPLETED");
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [shakeInput, setShakeInput] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [status, setStatus] = useState<"running" | "stopped">("running");
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const containerExpiryRef = useRef<Date | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!flag.trim() || isSubmitting) return;

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
        body: JSON.stringify({ answer: flag.trim() }),
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
        setErrorMessage(data.error || "Incorrect flag");
        setShakeInput(true);
        setTimeout(() => setShakeInput(false), 500);
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      setIsCompleted(true);
      setPointsEarned(data.pointsAwarded);
      show(`Correct! +${data.pointsAwarded} points`, "success");
      setFlag("");
    } catch {
      setErrorMessage("Network error. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [flag, isSubmitting, challenge.id, show]);

  useEffect(() => {
    containerExpiryRef.current = new Date(Date.now() + 30 * 60 * 1000);

    const updateTimer = () => {
      if (!containerExpiryRef.current) return;
      const now = new Date();
      const diff = containerExpiryRef.current.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft("Expired");
        setStatus("stopped");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}m ${secs}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => {
      clearInterval(interval);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const containerStyle: React.CSSProperties = {
    display: "flex",
    height: "100vh",
    margin: "-32px -24px -24px",
  };

  const infoPanelStyle: React.CSSProperties = {
    width: "320px",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };

  const infoContentStyle: React.CSSProperties = {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--text-1)",
    marginBottom: "12px",
  };

  const badgesRowStyle: React.CSSProperties = {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
    flexWrap: "wrap",
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-2)",
    lineHeight: 1.5,
    marginBottom: "20px",
    whiteSpace: "pre-wrap",
  };

  const dividerStyle: React.CSSProperties = {
    height: "1px",
    background: "var(--border)",
    margin: "20px 0",
  };

  const submitSectionStyle: React.CSSProperties = {};

  const flagInputStyle: React.CSSProperties = {
    marginBottom: "8px",
  };

  const errorStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--accent)",
    marginTop: "8px",
  };

  const completedBannerStyle: React.CSSProperties = {
    background: "rgba(63, 185, 80, 0.1)",
    border: "1px solid rgba(63, 185, 80, 0.3)",
    borderRadius: "8px",
    padding: "16px",
    textAlign: "center",
    marginBottom: "20px",
  };

  const completedTitleStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--success)",
    marginBottom: "4px",
  };

  const completedPointsStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--success)",
  };

  const statusRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "12px",
    color: "var(--text-2)",
    marginTop: "16px",
    padding: "8px 0",
    borderTop: "1px solid var(--border)",
  };

  const statusDotStyle: React.CSSProperties = {
    display: "inline-block",
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    marginRight: "6px",
    background: status === "running" ? "var(--success)" : "var(--text-3)",
  };

  const terminalPanelStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  };

  const terminalHeaderStyle: React.CSSProperties = {
    height: "36px",
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    padding: "0 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  };

  const terminalTitleStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "var(--text-3)",
  };

  const terminalHeaderActionsStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  const countdownStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "var(--text-2)",
    fontFamily: "monospace",
  };

  const terminalContentStyle: React.CSSProperties = {
    flex: 1,
    overflow: "hidden",
  };

  return (
    <div style={containerStyle}>
      <div style={infoPanelStyle}>
        <div style={infoContentStyle}>
          <div style={titleStyle}>{challenge.title}</div>

          <div style={badgesRowStyle}>
            <Badge variant="box">BOX</Badge>
            <Badge variant={challenge.difficulty.toLowerCase() as "easy" | "medium" | "hard"}>
              {challenge.difficulty}
            </Badge>
            <span style={{ fontSize: "12px", color: "var(--text-2)", alignSelf: "center" }}>
              {challenge.points} pts
            </span>
          </div>

          <div style={descriptionStyle}>{challenge.description}</div>

          {isCompleted && pointsEarned !== null && (
            <div style={completedBannerStyle}>
              <div style={completedTitleStyle}>Challenge Complete!</div>
              <div style={completedPointsStyle}>+{pointsEarned} points earned</div>
            </div>
          )}

          {!isCompleted && (
            <div style={submitSectionStyle}>
              <div style={flagInputStyle}>
                <Input
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                  placeholder="SEU{...}"
                  disabled={isSubmitting || retryCountdown !== null}
                  error={shakeInput ? "Incorrect flag" : undefined}
                  style={shakeInput ? { borderColor: "var(--accent)" } : {}}
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || retryCountdown !== null || !flag.trim()}
                loading={isSubmitting}
                style={{ width: "100%" }}
              >
                {retryCountdown !== null ? `${retryCountdown}s` : "Submit"}
              </Button>
              {errorMessage && <div style={errorStyle}>{errorMessage}</div>}
            </div>
          )}

          {isCompleted && (
            <Button disabled style={{ width: "100%" }}>
              Completed
            </Button>
          )}

          <div style={statusRowStyle}>
            <span>
              <span style={statusDotStyle} />
              {status === "running" ? "Container running" : "Container stopped"}
            </span>
            <span style={{ fontFamily: "monospace" }}>{timeLeft}</span>
          </div>
        </div>
      </div>

      <div style={terminalPanelStyle}>
        <div style={terminalHeaderStyle}>
          <span style={terminalTitleStyle}>Terminal</span>
          <div style={terminalHeaderActionsStyle}>
            <span style={countdownStyle}>{timeLeft}</span>
            <Button variant="ghost" size="sm">
              Reset
            </Button>
            <Button variant="ghost" size="sm">
              Add 30m
            </Button>
          </div>
        </div>
        <div style={terminalContentStyle}>
          <Terminal challengeId={challenge.id} />
        </div>
      </div>
    </div>
  );
}