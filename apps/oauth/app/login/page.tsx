import { LoginForm } from "@/app/login/login-form";
import { OauthFrame } from "@/app/components/oauth-frame";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <OauthFrame>
      <h1 className="oauth-title">Sign in</h1>
      <p className="oauth-subtitle oauth-subtitle--login">
        Enter your email and password. After you sign in, you&apos;ll return to
        finish connecting the app, if you started from one.
      </p>
      <Suspense
        fallback={<p className="oauth-loading">Loading…</p>}
      >
        <LoginForm />
      </Suspense>
    </OauthFrame>
  );
}
