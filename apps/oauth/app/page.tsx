import { OauthFrame } from "@/app/components/oauth-frame";
import Link from "next/link";

export default function Home() {
  return (
    <OauthFrame>
      <h1 className="oauth-title" style={{ marginBottom: 8 }}>
        Account access
      </h1>
      <p className="oauth-subtitle" style={{ marginBottom: 8 }}>
        Sign in and approve third-party apps that use Work Order Systems.
      </p>
      <nav aria-label="Main">
        <ul className="oauth-nav-list">
          <li>
            <Link href="/login">Sign in</Link>
          </li>
          <li>
            <Link href="/demo">Developer demo</Link>
          </li>
        </ul>
      </nav>
    </OauthFrame>
  );
}
