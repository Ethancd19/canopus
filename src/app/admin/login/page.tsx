"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      password,
      redirect: false,
    });

    if (res?.ok) {
      router.push("/admin/upload");
    } else {
      setError("Invalid password");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0E1824",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          padding: "0 1.5rem",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "28px",
            fontWeight: 300,
            color: "#B8C4D0",
            marginBottom: "0.5rem",
            letterSpacing: "0.1em",
          }}
        >
          Canopus
        </h1>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(240,242,244,0.3)",
            marginBottom: "3rem",
          }}
        >
          Admin
        </p>

        <form
          onSubmit={onSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "0.5px solid rgba(255,255,255,0.1)",
              padding: "0.85rem 1rem",
              color: "#B8C4D0",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")
            }
          />

          {error && (
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "#E07070",
                letterSpacing: "0.1em",
              }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              padding: "0.85rem",
              background: loading
                ? "rgba(240,242,244,0.05)"
                : "rgba(240,242,244,0.08)",
              border: "0.5px solid rgba(255,255,255,0.15)",
              color: loading ? "rgba(240,242,244,0.3)" : "#B8C4D0",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {loading ? "Signing in..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
