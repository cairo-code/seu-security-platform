import type { ReactNode } from "react";

type BadgeVariant =
  | "room"
  | "box"
  | "ctf"
  | "easy"
  | "medium"
  | "hard"
  | "admin"
  | "teacher"
  | "student"
  | "success"
  | "error"
  | "upcoming"
  | "active"
  | "ended";

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, {
  color: string;
  borderColor: string;
  backgroundColor: string;
}> = {
  room: { color: "#58a6ff", borderColor: "#1f4070", backgroundColor: "#0d1f3c" },
  box: { color: "#f78166", borderColor: "#6b2c1f", backgroundColor: "#2a0f08" },
  ctf: { color: "#bc8cff", borderColor: "#4a2d6b", backgroundColor: "#1a0f2e" },
  easy: { color: "#3fb950", borderColor: "#1a4d26", backgroundColor: "#081d0f" },
  medium: { color: "#d29922", borderColor: "#5a3f0a", backgroundColor: "#1f1508" },
  hard: { color: "#f78166", borderColor: "#6b2c1f", backgroundColor: "#2a0f08" },
  admin: { color: "#f78166", borderColor: "#6b2c1f", backgroundColor: "#2a0f08" },
  teacher: { color: "#d29922", borderColor: "#5a3f0a", backgroundColor: "#1f1508" },
  student: { color: "#8b949e", borderColor: "#30363d", backgroundColor: "#161b22" },
  success: { color: "#3fb950", borderColor: "#1a4d26", backgroundColor: "#081d0f" },
  error: { color: "#f78166", borderColor: "#6b2c1f", backgroundColor: "#2a0f08" },
  upcoming: { color: "#58a6ff", borderColor: "#1f4070", backgroundColor: "#0d1f3c" },
  active: { color: "#3fb950", borderColor: "#1a4d26", backgroundColor: "#081d0f" },
  ended: { color: "#6e7681", borderColor: "#21262d", backgroundColor: "#161b22" },
};

export default function Badge({ variant, children }: BadgeProps) {
  const style = variantStyles[variant];

  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "11px",
        fontWeight: 500,
        padding: "2px 6px",
        borderRadius: "4px",
        border: `1px solid ${style.borderColor}`,
        color: style.color,
        backgroundColor: style.backgroundColor,
      }}
    >
      {children}
    </span>
  );
}