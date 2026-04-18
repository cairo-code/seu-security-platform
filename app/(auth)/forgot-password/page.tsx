"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    setLoading(true);
    // TODO: integrate with backend mailer
    setTimeout(() => {
      setStatus("If an account exists for that email, a reset link will be sent.");
      setLoading(false);
    }, 1200);
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
        <h1 style={{ fontSize: 20, fontWeight: 600, textAlign: "center", color: "var(--text-1)", marginBottom: 20 }}>
          Forgot Password
        </h1>

        {status && (
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
            {status}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" loading={loading} style={{ width: "100%" }}>
            Send Reset Link
          </Button>
        </form>
        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <a href="/login" style={{ fontSize: '13px', color: 'var(--primary)' }}>&larr; Back to login</a>
        </div>
      </div>
    </div>
  );
}
