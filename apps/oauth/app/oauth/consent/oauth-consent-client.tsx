"use client";

import { IconCheck } from "@/app/components/icons";
import { scopeConsentLabel } from "@/app/components/scope-label";
import {
  type FormEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";

type Tenant = { id: string; name: string };

type Props = {
  authorizationId: string;
  clientName: string;
  redirectUri: string | null;
  scopes: string[];
  tenants: Tenant[];
};

export function OAuthConsentClient({
  authorizationId,
  clientName,
  redirectUri,
  scopes,
  tenants,
}: Props) {
  const hintId = useId();
  const errorId = useId();
  const [tenantError, setTenantError] = useState<string | null>(null);
  const submitLock = useRef(false);

  const onSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    if (submitLock.current) {
      e.preventDefault();
      return;
    }
    const form = e.currentTarget;
    const native = e.nativeEvent as SubmitEvent;
    const submitter = native.submitter as HTMLButtonElement | null;

    if (submitter?.name === "decision" && submitter.value === "approve") {
      const n = form.querySelectorAll<HTMLInputElement>(
        'input[name="tenant_ids"]:checked',
      ).length;
      if (n === 0) {
        e.preventDefault();
        setTenantError("Choose at least one organization, or select Not now.");
        return;
      }
    }
    setTenantError(null);

    form.style.pointerEvents = "none";
    form.style.opacity = "0.85";

    /*
     * Do not disable submit buttons in onSubmit: React re-renders before the browser
     * serializes the form, and disabled submitters are omitted from POST — so `decision`
     * never reaches /api/oauth/decision. Mirror the clicked button into a hidden field
     * (and Enter-key implicit submit uses the first decision button = deny).
     */
    let decision: "approve" | "deny" | null = null;
    if (
      submitter?.name === "decision" &&
      (submitter.value === "approve" || submitter.value === "deny")
    ) {
      decision = submitter.value;
    } else {
      const first = form.querySelector<HTMLButtonElement>(
        'button[type="submit"][name="decision"]',
      );
      if (first?.value === "approve" || first?.value === "deny") {
        decision = first.value;
      }
    }
    if (decision) {
      form
        .querySelectorAll("input[data-oauth-decision-field]")
        .forEach((el) => el.remove());
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = "decision";
      hidden.value = decision;
      hidden.setAttribute("data-oauth-decision-field", "");
      form.appendChild(hidden);
    }

    submitLock.current = true;
  }, []);

  const initial = clientName.charAt(0).toUpperCase();

  return (
    <>
      <header className="oauth-consent-header">
        <div className="oauth-app-row oauth-app-row--tight">
          <div className="oauth-app-mark" aria-hidden>
            {initial}
          </div>
          <div className="oauth-consent-heading-wrap">
            <p className="oauth-section-eyebrow">App access</p>
            <h1 className="oauth-title oauth-title--consent" id="consent-title">
              <span className="oauth-consent-app-name">{clientName}</span>
              <span className="oauth-consent-title-rest">
                {" "}
                wants to use your account
              </span>
            </h1>
          </div>
        </div>
      </header>

      {scopes.length > 0 ? (
        <section
          className="oauth-section"
          aria-labelledby="consent-scopes-heading"
        >
          <h2 className="oauth-section-heading" id="consent-scopes-heading">
            What they can do
          </h2>
          <ul className="oauth-scope-list">
            {scopes.map((s) => (
              <li key={s}>
                <span className="oauth-scope-icon" aria-hidden>
                  <IconCheck />
                </span>
                <span>{scopeConsentLabel(s)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="oauth-subtitle" id="consent-scopes-heading">
          Review the request below. You can allow or decline access.
        </p>
      )}

      <hr className="oauth-divider oauth-divider--section" />

      <form
        method="post"
        action="/api/oauth/decision"
        onSubmit={onSubmit}
        onInput={() => setTenantError(null)}
        aria-labelledby="consent-title"
        noValidate
      >
        <input type="hidden" name="authorization_id" value={authorizationId} />

        <fieldset
          className="oauth-tenant-fieldset"
          aria-describedby={
            tenantError ? `${hintId} ${errorId}` : hintId
          }
        >
          <legend className="oauth-tenant-legend">Organizations</legend>
          <p className="oauth-muted oauth-tenant-hint" id={hintId}>
            Only data for the organizations you select can be accessed. You can
            sign in again later to change this.
          </p>
          <ul className="oauth-tenant-list">
            {tenants.map((t, idx) => (
              <li key={t.id}>
                <label className="oauth-tenant-item">
                  <input
                    type="checkbox"
                    name="tenant_ids"
                    value={t.id}
                    defaultChecked={tenants.length === 1 || idx === 0}
                  />
                  <span>{t.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {tenantError ? (
          <p
            className="oauth-inline-alert"
            role="alert"
            id={errorId}
          >
            {tenantError}
          </p>
        ) : null}

        {redirectUri ? (
          <details className="oauth-advanced">
            <summary>Redirect URL (technical)</summary>
            <p className="mono-inline">{redirectUri}</p>
          </details>
        ) : null}

        <div
          className="oauth-action-row oauth-action-row--consent"
          role="group"
          aria-label="Allow or decline access"
        >
          <button
            type="submit"
            name="decision"
            value="deny"
            className="btn btn-ghost btn-lg"
          >
            Not now
          </button>
          <button
            type="submit"
            name="decision"
            value="approve"
            className="btn btn-primary btn-lg"
          >
            Allow access
          </button>
        </div>
      </form>
    </>
  );
}
