"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-next-path";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next");
  const next = safeNextPath(nextRaw);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <form className="oauth-form" onSubmit={onSubmit}>
      <div className="oauth-field">
        <label htmlFor="oauth-email">Email</label>
        <input
          id="oauth-email"
          className="oauth-input"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="oauth-field">
        <label htmlFor="oauth-password">Password</label>
        <input
          id="oauth-password"
          className="oauth-input"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? (
        <p className="oauth-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
