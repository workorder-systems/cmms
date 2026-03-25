import { OauthFrame } from "@/app/components/oauth-frame";
import { isOAuthDevDemoEnabled } from "@/lib/oauth-dev-mode";
import Link from "next/link";

export default function Home() {
  const demoEnabled = isOAuthDevDemoEnabled();

  return (
    <OauthFrame>
      <h1 className="oauth-title">Account access</h1>
      <p className="oauth-subtitle oauth-subtitle--home">
        {demoEnabled
          ? "Sign in to continue an app connection, or open the developer OAuth demo."
          : "Sign in to continue an app connection."}
      </p>
      <ul className="oauth-choice-list" aria-label="Actions">
        <li>
          <Link href="/login" className="oauth-choice">
            <span className="oauth-choice-title">Sign in</span>
            <span className="oauth-choice-desc">
              Continue to approve access for a third-party app.
            </span>
          </Link>
        </li>
        {demoEnabled ? (
          <li>
            <Link href="/demo" className="oauth-choice">
              <span className="oauth-choice-title">Developer demo</span>
              <span className="oauth-choice-desc">
                Run a sample OAuth flow against your Supabase project (non-production).
              </span>
            </Link>
          </li>
        ) : null}
      </ul>
    </OauthFrame>
  );
}
