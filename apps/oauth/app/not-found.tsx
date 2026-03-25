import { OauthFrame } from "@/app/components/oauth-frame";
import Link from "next/link";

export default function NotFound() {
  return (
    <OauthFrame>
      <h1 className="oauth-title">Page not found</h1>
      <p className="oauth-muted">
        The page you are looking for does not exist.
      </p>
      <div className="oauth-links-row oauth-space-top-md">
        <Link href="/">Account access</Link>
      </div>
    </OauthFrame>
  );
}
