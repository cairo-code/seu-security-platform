import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

interface PathCard {
  id: string;
  title: string;
  description: string;
  badgeUrl: string | null;
  createdAt: string;
  _count: { steps: number };
  isEnrolled: boolean;
}

async function fetchPaths(): Promise<PathCard[]> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("seu_access_token")?.value;

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/paths`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    cache: "no-store",
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data || [];
}

export default async function PathsPage() {
  const paths = await fetchPaths();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">Learning Paths</h1>

        {paths.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No paths available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paths.map((path) => (
              <div
                key={path.id}
                className="bg-gray-900 rounded-xl p-5 border border-gray-800 flex flex-col gap-3"
              >
                <h3 className="font-semibold text-lg">{path.title}</h3>
                <p className="text-gray-400 text-sm line-clamp-2">{path.description}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>{path._count?.steps || 0} steps</span>
                </div>
                <Link
                  href={`/paths/${path.id}`}
                  className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium text-center transition-colors ${
                    path.isEnrolled
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-200"
                  }`}
                >
                  {path.isEnrolled ? "Continue" : "Enroll"}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
