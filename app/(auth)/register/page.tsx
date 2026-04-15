"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type PasswordStrength = "weak" | "medium" | "strong";

function getPasswordStrength(password: string): PasswordStrength {
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const length = password.length;

  if (length >= 10 && hasNumber && hasSpecial) return "strong";
  if (length >= 8 && (hasNumber || hasSpecial)) return "medium";
  return "weak";
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const strengthSegments = useMemo(() => {
    if (passwordStrength === "strong") return [true, true, true];
    if (passwordStrength === "medium") return [true, true, false];
    return [true, false, false];
  }, [passwordStrength]);

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!universityId.trim()) {
      newErrors.universityId = "University ID is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) return;

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, universityId, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ form: data.error || "Registration failed" });
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setErrors({ form: "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          width: "340px",
          padding: "32px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 600,
            color: "var(--text-1)",
            textAlign: "center",
            marginBottom: "24px",
          }}
        >
          Create account
        </h1>

        {errors.form && (
          <div
            style={{
              background: "rgba(247,129,102,0.1)",
              border: "1px solid var(--accent)",
              borderRadius: "6px",
              padding: "10px 12px",
              fontSize: "13px",
              color: "var(--accent)",
              marginBottom: "16px",
            }}
          >
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <Input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <Input
              placeholder="University ID"
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              error={errors.universityId}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
            {password && (
              <div style={{ marginTop: "6px" }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                  {strengthSegments.map((active, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: "3px",
                        borderRadius: 0,
                        background: active
                          ? passwordStrength === "weak"
                            ? "var(--accent)"
                            : passwordStrength === "medium"
                              ? "var(--warning)"
                              : "var(--success)"
                          : "var(--border)",
                      }}
                    />
                  ))}
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    color:
                      passwordStrength === "weak"
                        ? "var(--accent)"
                        : passwordStrength === "medium"
                          ? "var(--warning)"
                          : "var(--success)",
                  }}
                >
                  {passwordStrength === "weak"
                    ? "Weak"
                    : passwordStrength === "medium"
                      ? "Medium"
                      : "Strong"}
                </span>
              </div>
            )}
          </div>

          <div style={{ marginBottom: "16px" }}>
            <Input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
            />
          </div>

          <Button type="submit" variant="primary" loading={loading} style={{ width: "100%" }}>
            Create account
          </Button>
        </form>

        <p
          style={{
            fontSize: "13px",
            color: "var(--text-2)",
            textAlign: "center",
            marginTop: "16px",
          }}
        >
          Already have an account?{" "}
          <a href="/login" style={{ color: "var(--primary)" }}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}