import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Badge from "@/components/ui/Badge";

interface UserProfile {
  id: string;
  name: string;
  universityId: string;
  email: string;
  role: string;
  points: number;
  createdAt: string;
}

interface UserStats {
  totalSubmissions: number;
  correctRate: number;
  completedPaths: number;
}

interface Certificate {
  id: string;
  pathTitle: string;
  generatedAt: string;
  cloudinaryUrl: string;
}

interface ProfileData {
  user: UserProfile;
  stats: UserStats;
  certificates: Certificate[];
}

async function fetchProfile(): Promise<ProfileData | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("seu_access_token")?.value;
  if (!accessToken) redirect("/login");

  const [userRes, statsRes, certsRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }),
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/stats`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }),
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/certificates`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }),
  ]);

  if (userRes.status === 401 || statsRes.status === 401 || certsRes.status === 401) {
    redirect("/login");
  }

  const user = userRes.ok ? await userRes.json() : null;
  const stats = statsRes.ok ? await statsRes.json() : null;
  const certificates = certsRes.ok ? await certsRes.json() : null;

  if (!user) return null;

  return {
    user: user.user || user,
    stats: stats || { totalSubmissions: 0, correctRate: 0, completedPaths: 0 },
    certificates: certificates || [],
  };
}

export default async function ProfilePage() {
  const data = await fetchProfile();
  if (!data) return null;

  const { user, stats, certificates } = data;

  const containerStyle: React.CSSProperties = {
    padding: "32px 0 24px",
  };

  const topSectionStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    paddingBottom: "20px",
    borderBottom: "1px solid var(--border)",
    marginBottom: "24px",
    flexWrap: "wrap",
  };

  const nameStyle: React.CSSProperties = {
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--text-1)",
  };

  const metadataStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "var(--text-2)",
  };

  const joinedStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-2)",
  };

  const statsRowStyle: React.CSSProperties = {
    display: "flex",
    gap: "32px",
    padding: "0 0 24px",
    borderBottom: "1px solid var(--border)",
  };

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
    marginBottom: "16px",
    marginTop: "24px",
  };

  const certificatesListStyle: React.CSSProperties = {};

  const certItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: "1px solid var(--border-2)",
  };

  const certInfoStyle: React.CSSProperties = {};

  const certTitleStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-1)",
    marginBottom: "4px",
  };

  const certDateStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "var(--text-3)",
  };

  const downloadLinkStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--primary)",
    textDecoration: "none",
  };

  const emptyStateStyle: React.CSSProperties = {
    color: "var(--text-3)",
    fontSize: "13px",
    padding: "16px 0",
  };

  const roleBadgeVariant = user.role === "ADMIN"
    ? "admin"
    : user.role === "TEACHER"
    ? "teacher"
    : "student";

  return (
    <div style={containerStyle}>
      <div style={topSectionStyle}>
        <div style={nameStyle}>{user.name}</div>
        <Badge variant={roleBadgeVariant}>{user.role}</Badge>
        <div style={metadataStyle}>
          <span style={{ fontFamily: "monospace" }}>{user.universityId}</span>
        </div>
        <div style={joinedStyle}>
          Joined {new Date(user.createdAt).toLocaleDateString()}
        </div>
      </div>

      <div style={statsRowStyle}>
        <div style={statItemStyle}>
          <div style={statLabelStyle}>Total Submissions</div>
          <div style={statValueStyle}>{stats.totalSubmissions}</div>
        </div>
        <div style={statItemStyle}>
          <div style={statLabelStyle}>Correct Rate</div>
          <div style={statValueStyle}>{stats.correctRate.toFixed(1)}%</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={statLabelStyle}>Completed Paths</div>
          <div style={statValueStyle}>{stats.completedPaths}</div>
        </div>
      </div>

      <div style={sectionTitleStyle}>Certificates</div>
      {certificates.length === 0 ? (
        <div style={emptyStateStyle}>
          No certificates earned. Complete a learning path to get your first certificate.
        </div>
      ) : (
        <div style={certificatesListStyle}>
          {certificates.map((cert) => (
            <div key={cert.id} style={certItemStyle}>
              <div style={certInfoStyle}>
                <div style={certTitleStyle}>{cert.pathTitle}</div>
                <div style={certDateStyle}>
                  {new Date(cert.generatedAt).toLocaleDateString()}
                </div>
              </div>
              <a
                href={cert.cloudinaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={downloadLinkStyle}
              >
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}