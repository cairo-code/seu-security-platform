"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type ChallengeType = "ROOM" | "BOX" | "CTF";

interface Challenge {
  id: string;
  title: string;
  type: ChallengeType;
  difficulty: Difficulty;
  points: number;
}

interface PathStep {
  order: number;
  challenge: Challenge;
}

interface Path {
  id: string;
  title: string;
  description: string;
  badgeUrl: string | null;
  isPublished: boolean;
  createdAt: string;
  steps: PathStep[];
}

interface UserProgress {
  status: string;
  completedStepOrders: number[];
}

interface PathViewerProps {
  path: Path;
  steps: PathStep[];
  userProgress: UserProgress | null;
}

export default function PathViewer({ path, steps, userProgress }: PathViewerProps) {
  const router = useRouter();
  const { show } = useToast();
  const [completedOrders, setCompletedOrders] = useState<Set<number>>(
    new Set(userProgress?.completedStepOrders || [])
  );

  const totalSteps = steps.length;
  const completedCount = completedOrders.size;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const isAllCompleted = completedCount === totalSteps;

  const handleDownloadCertificate = useCallback(async () => {
    try {
      const token = localStorage.getItem("seu_access_token") || "";
      const res = await fetch(`/api/paths/${path.id}/certificate`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        show("Certificate not available. Complete all steps first.", "error");
        return;
      }

      const data = await res.json();
      if (data.cloudinaryUrl) {
        window.open(data.cloudinaryUrl, "_blank");
      }
    } catch {
      show("Failed to download certificate", "error");
    }
  }, [path.id, show]);

  const containerStyle: React.CSSProperties = {
    padding: "32px 0 24px",
  };

  const topSectionStyle: React.CSSProperties = {
    marginBottom: "24px",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--text-1)",
    marginBottom: "8px",
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-2)",
    marginBottom: "16px",
    lineHeight: 1.5,
  };

  const progressSectionStyle: React.CSSProperties = {
    marginBottom: "16px",
  };

  const progressLabelsStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    color: "var(--text-2)",
    marginBottom: "6px",
  };

  const progressBarStyle: React.CSSProperties = {
    height: "4px",
    background: "var(--border)",
    borderRadius: "2px",
    overflow: "hidden",
  };

  const progressFillStyle: React.CSSProperties = {
    height: "100%",
    width: `${progressPercent}%`,
    background: "var(--primary)",
    transition: "width 200ms ease",
  };

  const stepsListStyle: React.CSSProperties = {};

  const stepItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    padding: "14px 0",
    borderBottom: "1px solid var(--border-2)",
  };

  const stepNumberStyle = (isCompleted: boolean, isActive: boolean, isLocked: boolean): React.CSSProperties => ({
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: 500,
    flexShrink: 0,
    marginRight: "16px",
    background: isCompleted ? "var(--success)" : isActive ? "var(--primary)" : "var(--border)",
    color: isCompleted || isActive ? "var(--bg)" : "var(--text-2)",
  });

  const stepContentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const stepTitleStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-1)",
    marginBottom: "4px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const stepBadgesStyle: React.CSSProperties = {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  };

  const stepPointsStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "var(--text-2)",
    marginLeft: "8px",
    flexShrink: 0,
  };

  const actionButtonContainerStyle: React.CSSProperties = {
    marginLeft: "16px",
    flexShrink: 0,
  };

  return (
    <div style={containerStyle}>
      <div style={topSectionStyle}>
        <div style={titleStyle}>{path.title}</div>
        <div style={descriptionStyle}>{path.description}</div>

        <div style={progressSectionStyle}>
          <div style={progressLabelsStyle}>
            <span>Overall Progress</span>
            <span>{completedCount}/{totalSteps} ({progressPercent}%)</span>
          </div>
          <div style={progressBarStyle}>
            <div style={progressFillStyle} />
          </div>
        </div>

        {isAllCompleted && (
          <Button variant="secondary" size="sm" onClick={handleDownloadCertificate}>
            Download Certificate
          </Button>
        )}
      </div>

      <div style={stepsListStyle}>
        {steps.map((step, index) => {
          const isCompleted = completedOrders.has(step.order);
          const isCurrent =
            !isCompleted &&
            (index === 0 || completedOrders.has(steps[index - 1].order));
          const isLocked = !isCompleted && !isCurrent;

          return (
            <div key={step.order} style={stepItemStyle}>
              <div
                style={stepNumberStyle(isCompleted, isCurrent, isLocked)}
              >
                {isCompleted ? "✓" : step.order}
              </div>

              <div style={stepContentStyle}>
                <div style={stepTitleStyle}>{step.challenge.title}</div>
                <div style={stepBadgesStyle}>
                  <Badge variant={step.challenge.type.toLowerCase() as "room" | "box" | "ctf"}>
                    {step.challenge.type}
                  </Badge>
                  <Badge variant={step.challenge.difficulty.toLowerCase() as "easy" | "medium" | "hard"}>
                    {step.challenge.difficulty}
                  </Badge>
                  <span style={stepPointsStyle}>{step.challenge.points} pts</span>
                </div>
              </div>

              <div style={actionButtonContainerStyle}>
                {isCompleted ? (
                  <Button disabled size="sm" variant="ghost">
                    Completed
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => router.push(`/challenges/${step.challenge.id}`)}
                    disabled={isLocked}
                  >
                    {isCurrent ? "Start" : "Locked"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}