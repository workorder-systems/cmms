"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-next-path";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next");
  const next = safeNextPath(nextRaw);
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signError) {
        setError(signError.message);
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="oauth-form"
      onSubmit={onSubmit}
      aria-busy={loading}
      aria-describedby={error ? errorId : undefined}
      noValidate
    >
      <div className="oauth-field">
        <label htmlFor="oauth-email">Email</label>
        <input
          id="oauth-email"
          className="oauth-input"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="oauth-field">
        <div className="oauth-field-head">
          <label htmlFor="oauth-password">Password</label>
          <button
            type="button"
            className="oauth-reveal-password"
            onClick={() => setShowPassword((v) => !v)}
            aria-pressed={showPassword}
            disabled={loading}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <input
          id="oauth-password"
          className="oauth-input"
          type={showPassword ? "text" : "password"}
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </div>
      {error ? (
        <p className="oauth-error" role="alert" id={errorId}>
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary btn-lg"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
