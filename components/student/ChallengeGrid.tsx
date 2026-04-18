"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Badge from "@/components/ui/Badge";

type ChallengeType = "ROOM" | "BOX" | "CTF";
type Difficulty = "EASY" | "MEDIUM" | "HARD";

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
  _count: { tasks: number; submissions: number };
}

interface PathProgress {
  id: string;
  pathId: string;
  pathTitle: string;
  completedSteps: number;
  totalSteps: number;
  status: string;
  startedAt: string;
}

interface Submission {
  id: string;
  challengeTitle: string;
  challengeId: string;
  isCorrect: boolean;
  submittedAt: string;
}

interface HeaderStats {
  points: number;
  globalRank: number;
  completedChallenges: number;
  activePaths: number;
}

interface ChallengeGridProps {
  initialChallenges: Challenge[];
  userName?: string;
  stats?: HeaderStats;
  activePaths?: PathProgress[];
  recentActivity?: Submission[];
}

const typeTabs = ["All", "ROOM", "BOX", "CTF"] as const;
const difficultyOptions = ["All", "EASY", "MEDIUM", "HARD"] as const;

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function ChallengeGrid({
  initialChallenges,
  userName,
  stats,
  activePaths,
  recentActivity,
}: ChallengeGridProps) {
  const router = useRouter();
  const [activeType, setActiveType] = useState<string>("All");
  const [activeDifficulty, setActiveDifficulty] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    return initialChallenges.filter((c) => {
      const matchesType = activeType === "All" || c.type === activeType;
      const matchesDifficulty =
        activeDifficulty === "All" || c.difficulty === activeDifficulty;
      const matchesSearch =
        !searchQuery ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesDifficulty && matchesSearch;
    });
  }, [initialChallenges, activeType, activeDifficulty, searchQuery]);

  const containerStyle: React.CSSProperties = {
    padding: "32px 0 24px",
  };

  const userNameStyle: React.CSSProperties = userName
    ? {
        fontSize: "20px",
        fontWeight: 600,
        color: "var(--text-1)",
        marginBottom: "24px",
      }
    : {};

  const statsRowStyle: React.CSSProperties = stats
    ? {
        display: "flex",
        gap: "32px",
        padding: "0 0 24px",
        borderBottom: "1px solid var(--border)",
      }
    : {};

  const statItemStyle: React.CSSProperties = {
    flex: 1,
    paddingRight: "24px",
    borderRight: "1px solid var(--border)",
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "var(--text-2)",
    marginBottom: "4px",
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: "20px",
    fontWeight: 600,
    color: "var(--text-1)",
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-2)",
    marginBottom: "12px",
    marginTop: "24px",
  };

  const pathsScrollStyle: React.CSSProperties = {
    display: "flex",
    gap: "16px",
    overflowX: "auto",
    paddingBottom: "8px",
  };

  const pathCardStyle: React.CSSProperties = {
    minWidth: "240px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "16px",
  };

  const pathTitleStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-1)",
    marginBottom: "8px",
  };

  const progressTextStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "var(--text-3)",
    marginBottom: "8px",
  };

  const progressBarStyle: React.CSSProperties = {
    height: "4px",
    background: "var(--border)",
    borderRadius: "2px",
    marginBottom: "12px",
    overflow: "hidden",
  };

  const continueLinkStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--primary)",
  };

  const activityTableStyle: React.CSSProperties = {
    width: "100%",
    borderTop: "1px solid var(--border)",
    marginTop: "24px",
    paddingTop: "24px",
  };

  const tableHeaderStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "var(--text-2)",
    borderBottom: "1px solid var(--border)",
    padding: "8px 0",
    textAlign: "left",
  };

  const tableRowStyle: React.CSSProperties = {
    borderBottom: "1px solid var(--border-2)",
    padding: "10px 0",
  };

  const tableCellStyle: React.CSSProperties = {
    padding: "10px 0",
    fontSize: "13px",
  };

  const linkStyle: React.CSSProperties = {
    color: "var(--primary)",
  };

  const timeStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "var(--text-3)",
  };

  const filterBarStyle: React.CSSProperties = {
    display: "flex",
    gap: "16px",
    alignItems: "center",
    marginBottom: "24px",
    flexWrap: "wrap",
  };

  const typeTabsStyle: React.CSSProperties = {
    display: "flex",
    gap: "0",
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: "8px 16px",
    fontSize: "13px",
    color: isActive ? "var(--primary)" : "var(--text-2)",
    borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
    background: "transparent",
    borderTop: "none",
    borderLeft: "none",
    borderRight: "none",
    cursor: "pointer",
    transition: "color 150ms ease, border-color 150ms ease",
  });

  const selectStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    color: "var(--text-1)",
    fontSize: "13px",
    padding: "8px 12px",
    outline: "none",
    cursor: "pointer",
  };

  const searchInputStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    color: "var(--text-1)",
    fontSize: "13px",
    padding: "8px 12px",
    outline: "none",
    width: "200px",
    transition: "border-color 150ms ease",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1px",
    background: "var(--border)",
  };

  const cellStyle: React.CSSProperties = {
    background: "var(--bg)",
    padding: "20px",
    cursor: "pointer",
    transition: "background 150ms ease",
  };

  const cellTopRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
  };

  const pointsStyle: React.CSSProperties = {
    marginLeft: "auto",
    fontSize: "13px",
    color: "var(--text-2)",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "15px",
    fontWeight: 500,
    color: "var(--text-1)",
    margin: "10px 0 6px",
  };

  const taskCountStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "var(--text-3)",
  };

  const progressStyle: React.CSSProperties = {
    marginTop: "12px",
  };

  const completedTextStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "var(--success)",
  };

  const renderDashboard = () => (
    <div style={containerStyle}>
      {userName && <div style={userNameStyle}>{userName}</div>}

      {stats && (
        <div style={statsRowStyle}>
          <div style={statItemStyle}>
            <div style={statLabelStyle}>Points</div>
            <div style={statValueStyle}>{stats.points}</div>
          </div>
          <div style={statItemStyle}>
            <div style={statLabelStyle}>Global Rank</div>
            <div style={statValueStyle}>
              {stats.globalRank > 0 ? `#${stats.globalRank}` : "—"}
            </div>
          </div>
          <div style={statItemStyle}>
            <div style={statLabelStyle}>Completed</div>
            <div style={statValueStyle}>{stats.completedChallenges}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={statLabelStyle}>Active Paths</div>
            <div style={statValueStyle}>{stats.activePaths}</div>
          </div>
        </div>
      )}

      {activePaths && activePaths.length > 0 && (
        <>
          <div style={sectionTitleStyle}>Active Paths</div>
          <div style={pathsScrollStyle}>
            {activePaths.map((path) => {
              const progressPercent =
                path.totalSteps > 0
                  ? Math.round((path.completedSteps / path.totalSteps) * 100)
                  : 0;
              return (
                <div key={path.id} style={pathCardStyle}>
                  <div style={pathTitleStyle}>{path.pathTitle}</div>
                  <div style={progressTextStyle}>
                    {path.completedSteps}/{path.totalSteps} steps
                  </div>
                  <div style={progressBarStyle}>
                    <div
                      style={{
                        height: "100%",
                        width: `${progressPercent}%`,
                        background: "var(--primary)",
                        transition: "width 200ms ease",
                      }}
                    />
                  </div>
                  <Link href={`/paths/${path.pathId}`} style={continueLinkStyle}>
                    Continue
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}

      {recentActivity && recentActivity.length > 0 && (
        <div style={activityTableStyle}>
          <div style={sectionTitleStyle}>Recent Activity</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...tableHeaderStyle, width: "40%" }}>Challenge</th>
                <th style={{ ...tableHeaderStyle, width: "20%" }}>Result</th>
                <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((sub) => (
                <tr key={sub.id} style={tableRowStyle}>
                  <td style={tableCellStyle}>
                    <Link
                      href={`/challenges/${sub.challengeId}`}
                      style={linkStyle}
                    >
                      {sub.challengeTitle}
                    </Link>
                  </td>
                  <td style={tableCellStyle}>
                    <Badge variant={sub.isCorrect ? "success" : "error"}>
                      {sub.isCorrect ? "Correct" : "Incorrect"}
                    </Badge>
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: "right" }}>
                    <span style={timeStyle}>{formatTimeAgo(sub.submittedAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderChallengeSection = () => (
    <>
      <div style={filterBarStyle}>
        <div style={typeTabsStyle}>
          {typeTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveType(tab)}
              style={tabStyle(activeType === tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <select
          value={activeDifficulty}
          onChange={(e) => setActiveDifficulty(e.target.value)}
          style={selectStyle}
        >
          {difficultyOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "All" ? "All Difficulties" : opt}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search challenges..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={searchInputStyle}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: "var(--text-3)", fontSize: "13px", padding: "32px 0", textAlign: "center" }}>
          No challenges found.
        </div>
      ) : (
        <div style={gridStyle}>
          {filtered.map((challenge) => (
            <div
              key={challenge.id}
              style={cellStyle}
              onClick={() => router.push(`/challenges/${challenge.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--surface-2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg)";
              }}
            >
              <div style={cellTopRowStyle}>
                <Badge variant={challenge.type.toLowerCase() as "room" | "box" | "ctf"}>
                  {challenge.type}
                </Badge>
                <Badge variant={challenge.difficulty.toLowerCase() as "easy" | "medium" | "hard"}>
                  {challenge.difficulty}
                </Badge>
                <span style={pointsStyle}>{challenge.points} pts</span>
              </div>

              <div style={titleStyle}>{challenge.title}</div>

              {challenge.type === "ROOM" && (
                <div style={taskCountStyle}>
                  {challenge._count?.tasks || 0} tasks
                </div>
              )}

              <div style={progressStyle}>
                {challenge._count?.submissions && challenge._count.submissions > 0 ? (
                  <div style={completedTextStyle}>Attempted</div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const isDashboard = !!userName;

  return (
    <div>
      {renderDashboard()}
      {renderChallengeSection()}
    </div>
  );
}