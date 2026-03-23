import { PartnerDemoClient } from "@/app/demo/partner-demo-client";
import { OauthFrame } from "@/app/components/oauth-frame";
import { Suspense } from "react";

export default function DemoPage() {
  return (
    <Suspense
      fallback={
        <OauthFrame wide>
          <p className="oauth-loading">Loading…</p>
        </OauthFrame>
      }
    >
      <PartnerDemoClient />
    </Suspense>
  );
}
