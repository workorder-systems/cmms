import type { ReactNode } from "react";

import { OauthHeroBackdrop } from "@/app/components/oauth-hero-backdrop";
import { WorkOrderBrand } from "@/app/components/work-order-brand";

type Props = {
  children: ReactNode;
  /** Slightly wider card (e.g. developer demo). */
  wide?: boolean;
};

/** Centered shell styled like apps/docs (zinc surfaces, primary cyan accents). */
export function OauthFrame({ children, wide }: Props) {
  return (
    <div className="oauth-viewport">
      <OauthHeroBackdrop />
      <div className="oauth-frame-column">
        <WorkOrderBrand />
        <main
          id="oauth-main"
          className={`oauth-card${wide ? " oauth-card--wide" : ""}`}
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
      <p className="oauth-footer-brand" aria-hidden>
        Work Order Systems
      </p>
    </div>
  );
}
