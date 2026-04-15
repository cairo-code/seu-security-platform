"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/student/Toast";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  universityId: string;
  points: number;
  completedChallenges: number;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  total: number;
  page: number;
  callerRank: number;
}

interface Group {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
}

export default function LeaderboardPage() {
  const { show } = useToast();
  const [activeTab, setActiveTab] = useState<"global" | "groups">("global");
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [callerRank, setCallerRank] = useState<number>(0);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [groupLeaderboard, setGroupLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [inviteCode, setInviteCode] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [callerUserId, setCallerUserId] = useState<string>("");

  const limit = 20;

  const fetchGlobal = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("seu_access_token") || "";
      const res = await fetch(
        `/api/leaderboard?scope=global&limit=${limit}&page=${page}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data: LeaderboardResponse = await res.json();
        setGlobalLeaderboard(data.leaderboard);
        setCallerRank(data.callerRank);
        setTotal(data.total);

        const callerEntry = data.leaderboard.find(
          (e) => e.rank === data.callerRank
        );
        if (callerEntry) setCallerUserId(callerEntry.userId);
      }
    } catch {
      show("Failed to load leaderboard", "error");
    } finally {
      setIsLoading(false);
    }
  }, [page, show]);

  const fetchGroups = useCallback(async () => {
    try {
      const token = localStorage.getItem("seu_access_token") || "";
      const res = await fetch("/api/groups", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: Group[] = await res.json();
        setGroups(data);
        if (data.length > 0 && !selectedGroup) {
          setSelectedGroup(data[0].id);
        }
      }
    } catch {
      show("Failed to load groups", "error");
    }
  }, [selectedGroup, show]);

  const fetchGroupLeaderboard = useCallback(async (groupId: string) => {
    if (!groupId) return;
    try {
      const token = localStorage.getItem("seu_access_token") || "";
      const res = await fetch(
        `/api/leaderboard?scope=group&groupId=${groupId}&limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data: LeaderboardResponse = await res.json();
        setGroupLeaderboard(data.leaderboard);
      }
    } catch {
      show("Failed to load group leaderboard", "error");
    }
  }, [show]);

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) return;
    try {
      const token = localStorage.getItem("seu_access_token") || "";
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        show(data.error || "Failed to join group", "error");
        return;
      }

      show("Joined group successfully!", "success");
      setInviteCode("");
      setShowJoinForm(false);
      fetchGroups();
    } catch {
      show("Failed to join group", "error");
    }
  };

  useEffect(() => {
    if (activeTab === "global") {
      fetchGlobal();
    } else {
      fetchGroups();
    }
  }, [activeTab, page, fetchGlobal, fetchGroups]);

  useEffect(() => {
    if (activeTab === "groups" && selectedGroup) {
      fetchGroupLeaderboard(selectedGroup);
    }
  }, [activeTab, selectedGroup, fetchGroupLeaderboard]);

  const containerStyle: React.CSSProperties = {
    padding: "32px 0 24px",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "24px",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "20px",
    fontWeight: 600,
    color: "var(--text-1)",
  };

  const tabBarStyle: React.CSSProperties = {
    display: "flex",
    gap: "24px",
    borderBottom: "1px solid var(--border)",
    marginBottom: "24px",
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: "12px 0",
    fontSize: "13px",
    fontWeight: 500,
    color: isActive ? "var(--primary)" : "var(--text-2)",
    borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
    background: "transparent",
    borderTop: "none",
    borderLeft: "none",
    borderRight: "none",
    cursor: "pointer",
    transition: "color 150ms ease, border-color 150ms ease",
  });

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
  };

  const tableHeaderStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "var(--text-2)",
    borderBottom: "1px solid var(--border)",
    padding: "10px 0",
    textAlign: "left",
  };

  const tableRowStyle: React.CSSProperties = {
    borderBottom: "1px solid var(--border-2)",
  };

  const tableCellStyle: React.CSSProperties = {
    padding: "10px 0",
    fontSize: "13px",
  };

  const callerRowStyle: React.CSSProperties = {
    ...tableRowStyle,
    background: "rgba(88, 166, 255, 0.05)",
  };

  const rankColumnStyle: React.CSSProperties = {
    ...tableCellStyle,
    width: "40px",
    color: "var(--text-3)",
  };

  const nameColumnStyle: React.CSSProperties = {
    ...tableCellStyle,
  };

  const uniIdColumnStyle: React.CSSProperties = {
    ...tableCellStyle,
    color: "var(--text-2)",
    fontFamily: "monospace",
    fontSize: "12px",
  };

  const pointsColumnStyle: React.CSSProperties = {
    ...tableCellStyle,
    textAlign: "right",
    fontWeight: 600,
  };

  const completedColumnStyle: React.CSSProperties = {
    ...tableCellStyle,
    textAlign: "right",
  };

  const selectStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    color: "var(--text-1)",
    fontSize: "13px",
    padding: "8px 12px",
    outline: "none",
    cursor: "pointer",
    marginBottom: "16px",
  };

  const joinFormStyle: React.CSSProperties = {
    display: "flex",
    gap: "8px",
    marginTop: "16px",
    marginBottom: "24px",
  };

  const joinInputStyle: React.CSSProperties = {
    flex: 1,
    maxWidth: "300px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    color: "var(--text-1)",
    fontSize: "13px",
    padding: "8px 12px",
    outline: "none",
  };

  const paginationStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginTop: "24px",
  };

  const pageButtonStyle: React.CSSProperties = {
    padding: "6px 12px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    color: "var(--text-1)",
    fontSize: "13px",
    cursor: "pointer",
  };

  const pageInfoStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-2)",
  };

  const callerRankStyle: React.CSSProperties = {
    textAlign: "center",
    fontSize: "13px",
    color: "var(--text-2)",
    marginTop: "12px",
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>Leaderboard</div>
      </div>

      <div style={tabBarStyle}>
        <button
          onClick={() => setActiveTab("global")}
          style={tabStyle(activeTab === "global")}
        >
          Global
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          style={tabStyle(activeTab === "groups")}
        >
          My Groups
        </button>
      </div>

      {activeTab === "global" && (
        <div>
          {isLoading ? (
            <div style={{ color: "var(--text-3)", fontSize: "13px", padding: "32px 0", textAlign: "center" }}>
              Loading...
            </div>
          ) : (
            <>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Rank</th>
                    <th style={tableHeaderStyle}>Name</th>
                    <th style={tableHeaderStyle}>University ID</th>
                    <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Points</th>
                    <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {globalLeaderboard.map((entry) => (
                    <tr
                      key={entry.userId}
                      style={entry.userId === callerUserId ? callerRowStyle : tableRowStyle}
                    >
                      <td style={rankColumnStyle}>#{entry.rank}</td>
                      <td style={nameColumnStyle}>{entry.name}</td>
                      <td style={uniIdColumnStyle}>{entry.universityId}</td>
                      <td style={pointsColumnStyle}>{entry.points}</td>
                      <td style={completedColumnStyle}>{entry.completedChallenges}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {callerRank > limit && (
                <div style={callerRankStyle}>Your rank: #{callerRank}</div>
              )}

              <div style={paginationStyle}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ ...pageButtonStyle, opacity: page === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <span style={pageInfoStyle}>Page {page}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * limit >= total}
                  style={{ ...pageButtonStyle, opacity: page * limit >= total ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "groups" && (
        <div>
          {groups.length === 0 ? (
            <div style={{ color: "var(--text-3)", fontSize: "13px", padding: "32px 0", textAlign: "center" }}>
              You haven&apos;t joined any groups yet.
            </div>
          ) : (
            <>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                style={selectStyle}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.memberCount} members)
                  </option>
                ))}
              </select>

              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Rank</th>
                    <th style={tableHeaderStyle}>Name</th>
                    <th style={tableHeaderStyle}>University ID</th>
                    <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Points</th>
                    <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {groupLeaderboard.map((entry) => (
                    <tr key={entry.userId} style={tableRowStyle}>
                      <td style={rankColumnStyle}>#{entry.rank}</td>
                      <td style={nameColumnStyle}>{entry.name}</td>
                      <td style={uniIdColumnStyle}>{entry.universityId}</td>
                      <td style={pointsColumnStyle}>{entry.points}</td>
                      <td style={completedColumnStyle}>{entry.completedChallenges}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div style={joinFormStyle}>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code..."
              style={joinInputStyle}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoinGroup();
              }}
            />
            <button
              onClick={handleJoinGroup}
              style={{
                padding: "8px 16px",
                background: "var(--primary)",
                border: "1px solid var(--primary)",
                borderRadius: "6px",
                color: "var(--bg)",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Join Group
            </button>
          </div>
        </div>
      )}
    </div>
  );
}