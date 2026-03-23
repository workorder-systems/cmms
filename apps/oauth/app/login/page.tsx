import { LoginForm } from "@/app/login/login-form";
import { OauthFrame } from "@/app/components/oauth-frame";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <OauthFrame>
      <h1 className="oauth-title">Sign in</h1>
      <p className="oauth-subtitle" style={{ marginBottom: 28 }}>
        Use your Work Order Systems account to continue.
      </p>
      <Suspense
        fallback={<p className="oauth-loading">Loading…</p>}
      >
        <LoginForm />
      </Suspense>
    </OauthFrame>
  );
}
