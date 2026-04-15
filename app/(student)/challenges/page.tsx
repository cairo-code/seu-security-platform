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

export default async function ChallengesPage() {
  const challenges = await fetchChallenges();
  return <ChallengeGrid initialChallenges={challenges} />;
}