import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      if (signInError.message.toLowerCase().includes("invalid") || signInError.message.toLowerCase().includes("email not confirmed")) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          setError(signUpError.message);
        } else {
          setMessage("Account created! Check your email to confirm, or you're logged in.");
        }
      } else {
        setError(signInError.message);
      }
    }

    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'DM Mono', monospace",
    }}>
      <div style={{ width: "100%", maxWidth: "360px" }}>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "52px",
          letterSpacing: "4px",
          color: "#e8e8e0",
          marginBottom: "8px",
          lineHeight: 1,
        }}>
          THIS NEW MONTH
        </h1>
        <p style={{ color: "#555", fontSize: "13px", marginBottom: "48px" }}>
          Track your habits. Build your discipline.
        </p>

        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px 20px",
            background: "transparent",
            border: "1px solid #1a1a1a",
            color: "#e8e8e0",
            fontFamily: "'DM Mono', monospace",
            fontSize: "13px",
            letterSpacing: "1px",
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            transition: "border-color 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#444")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "#1a1a1a")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div style={{ flex: 1, height: "1px", background: "#111" }} />
          <span style={{ color: "#444", fontSize: "11px", letterSpacing: "2px" }}>OR</span>
          <div style={{ flex: 1, height: "1px", background: "#111" }} />
        </div>

        <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "13px 16px",
              background: "#0d0d0d",
              border: "1px solid #1a1a1a",
              color: "#e8e8e0",
              fontFamily: "'DM Mono', monospace",
              fontSize: "13px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "13px 16px",
              background: "#0d0d0d",
              border: "1px solid #1a1a1a",
              color: "#e8e8e0",
              fontFamily: "'DM Mono', monospace",
              fontSize: "13px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {error && <p style={{ color: "#f87171", fontSize: "12px", margin: 0 }}>{error}</p>}
          {message && <p style={{ color: "#4ade80", fontSize: "12px", margin: 0 }}>{message}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 20px",
              background: "#e8e8e0",
              border: "none",
              color: "#0a0a0a",
              fontFamily: "'DM Mono', monospace",
              fontSize: "13px",
              letterSpacing: "1px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "bold",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "..." : "Sign In / Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
