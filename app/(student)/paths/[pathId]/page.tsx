import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import PathViewer from "@/components/student/PathViewer";

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
  userProgress: {
    status: string;
    completedStepOrders: number[];
  } | null;
}

async function fetchPath(id: string): Promise<Path | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("seu_access_token")?.value;
  if (!accessToken) redirect("/login");

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/paths/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (res.status === 401) redirect("/login");
  if (!res.ok) return null;

  return res.json();
}

export default async function PathDetailPage({
  params,
}: {
  params: { pathId: string };
}) {
  const path = await fetchPath(params.pathId);
  if (!path) notFound();

  const sortedSteps = [...path.steps].sort((a, b) => a.order - b.order);

  return <PathViewer path={path} steps={sortedSteps} userProgress={path.userProgress} />;
}
