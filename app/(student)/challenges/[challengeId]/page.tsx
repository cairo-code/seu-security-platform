import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import RoomPlayer from "@/components/student/RoomPlayer";
import BoxPlayer from "@/components/student/BoxPlayer";
import CTFPlayer from "@/components/student/CTFPlayer";
import type { RoomPlayerProps } from "@/components/student/RoomPlayer";
import type { BoxPlayerProps } from "@/components/student/BoxPlayer";
import type { CTFPlayerProps } from "@/components/student/CTFPlayer";

type ChallengeType = "ROOM" | "BOX" | "CTF";
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
  type: ChallengeType;
  difficulty: Difficulty;
  points: number;
  dockerImage: string | null;
  templateConfig: unknown;
  isPublished: boolean;
  createdAt: string;
}

interface ChallengeDetail {
  challenge: Challenge;
  tasks: Task[];
  progress: {
    status: string;
    completedTaskIds: string[];
  } | null;
}

async function fetchChallenge(id: string): Promise<ChallengeDetail | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("seu_access_token")?.value;
  if (!accessToken) redirect("/login");

  const [challengeRes, progressRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/admin/challenges/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }),
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/challenges/${id}/progress`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }),
  ]);

  if (challengeRes.status === 401 || progressRes.status === 401) redirect("/login");
  if (!challengeRes.ok) return null;

  const challengeData = await challengeRes.json();
  const progressData = progressRes.ok ? await progressRes.json() : null;

  return {
    challenge: challengeData.challenge,
    tasks: progressData?.tasks || [],
    progress: progressData?.progress || null,
  };
}

export default async function ChallengeDetailPage({
  params,
}: {
  params: { challengeId: string };
}) {
  const data = await fetchChallenge(params.challengeId);
  if (!data) notFound();

  const { challenge, tasks, progress } = data;

  if (challenge.type === "ROOM") {
    return <RoomPlayer challenge={challenge as RoomPlayerProps["challenge"]} tasks={tasks} progress={progress} />;
  }

  if (challenge.type === "BOX") {
    return <BoxPlayer challenge={challenge as BoxPlayerProps["challenge"]} progress={progress} />;
  }

  return <CTFPlayer challenge={challenge as CTFPlayerProps["challenge"]} progress={progress} />;
}
