import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ChallengeGrid from "@/components/student/ChallengeGrid";

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

async function fetchChallenges(): Promise<Challenge[]> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("seu_access_token")?.value;
  if (!accessToken) redirect("/login");

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/admin/challenges?published=true&limit=200`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (res.status === 401) redirect("/login");
  if (!res.ok) return [];

  const data = await res.json();
  return data.challenges || [];
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

interface UserProfile {
  id: string;
  name: string;
}

interface LeaderboardEntry {
  rank: number;
  points: number;
  completedChallenges: number;
}

async function fetchUserData(): Promise<{
  user: UserProfile | null;
  paths: PathProgress[];
  submissions: Submission[];
  leaderboard: LeaderboardEntry | null;
  callerRank: number;
} | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("seu_access_token")?.value;
  if (!accessToken) return null;

  const [userRes, pathsRes, submissionsRes, leaderboardRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }),
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/paths/progress`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }),
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/submissions/recent`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }),
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/leaderboard?limit=1`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }),
  ]);

  if (userRes.status === 401) redirect("/login");

  const user = userRes.ok ? await userRes.json() : null;
  const paths = pathsRes.ok ? await pathsRes.json() : null;
  const submissions = submissionsRes.ok ? await submissionsRes.json() : null;
  const leaderboard = leaderboardRes.ok ? await leaderboardRes.json() : null;

  return {
    user: user?.user || user,
    paths: paths?.paths || [],
    submissions: submissions?.submissions || [],
    leaderboard: leaderboard?.leaderboard?.[0] || null,
    callerRank: leaderboard?.callerRank || 0,
  };
}

export default async function DashboardPage() {
  const data = await fetchUserData();
  if (!data) redirect("/login");

  const { user, paths, submissions, leaderboard, callerRank } = data;

  const stats = {
    points: leaderboard?.points ?? 0,
    globalRank: callerRank,
    completedChallenges: leaderboard?.completedChallenges ?? 0,
    activePaths: paths.filter((p) => p.status === "IN_PROGRESS").length,
  };

  const activePaths = paths.filter((p) => p.status === "IN_PROGRESS");
  const recentActivity = submissions.slice(0, 5);

  const challenges = await fetchChallenges();

  return (
    <ChallengeGrid
      initialChallenges={challenges}
      userName={user?.name || "Student"}
      stats={stats}
      activePaths={activePaths}
      recentActivity={recentActivity}
    />
  );
}