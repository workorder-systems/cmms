import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Slightly wider card (e.g. developer demo). */
  wide?: boolean;
};

/** Centered card shell (Google-style account / consent layout). */
export function OauthFrame({ children, wide }: Props) {
  return (
    <div className="oauth-viewport">
      <div className={`oauth-card${wide ? " oauth-card--wide" : ""}`}>
        {children}
      </div>
      <p className="oauth-footer-brand" aria-hidden>
        Work Order Systems
      </p>
    </div>
  );
}
