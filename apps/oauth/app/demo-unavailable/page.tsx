import { OauthFrame } from "@/app/components/oauth-frame";
import Link from "next/link";

/**
 * Shown when `/demo` is rewritten here (demo disabled) or when visited directly.
 * Not linked from production home when dev demo is off.
 */
export default function DemoUnavailablePage() {
  return (
    <OauthFrame>
      <h1 className="oauth-title">Not available</h1>
      <p className="oauth-muted">
        The developer OAuth playground is turned off for this deployment.
      </p>
      <p className="oauth-muted oauth-space-top-sm">
        Use <strong>Sign in</strong> when an app sends you here to approve access.
      </p>
      <div className="oauth-links-row oauth-space-top-md">
        <Link href="/login">Sign in</Link>
        <Link href="/">Home</Link>
      </div>
    </OauthFrame>
  );
}
