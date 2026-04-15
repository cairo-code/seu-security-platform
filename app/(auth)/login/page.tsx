"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { setAuth } from "@/lib/auth/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const showRegistered = searchParams.get("registered") === "1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      setAuth(data.accessToken, data.user);
      router.push("/");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
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
          SEU Playground
        </h1>

        {showRegistered && (
          <div
            style={{
              background: "rgba(63,185,80,0.1)",
              border: "1px solid var(--success)",
              borderRadius: "6px",
              padding: "10px 12px",
              fontSize: "13px",
              color: "var(--success)",
              marginBottom: "16px",
            }}
          >
            Account created successfully. Please sign in.
          </div>
        )}

        {error && (
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
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" variant="primary" loading={loading} style={{ width: "100%" }}>
            Sign in
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
          New to SEU Playground?{" "}
          <a href="/register" style={{ color: "var(--primary)" }}>
            Create an account
          </a>
        </p>
      </div>
    </div>
  );
}