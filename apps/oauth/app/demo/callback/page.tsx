import { DemoCallbackClient } from "@/app/demo/callback/callback-client";
import { OauthFrame } from "@/app/components/oauth-frame";
import { Suspense } from "react";

export default function DemoCallbackPage() {
  return (
    <Suspense
      fallback={
        <OauthFrame wide>
          <p className="oauth-loading">Loading…</p>
        </OauthFrame>
      }
    >
      <DemoCallbackClient />
    </Suspense>
  );
}
