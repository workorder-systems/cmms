import { afterEach, describe, expect, it } from "vitest";

import { isOAuthDevDemoEnabled } from "./oauth-dev-mode";

const keys = [
  "OAUTH_ENABLE_DEV_DEMO",
  "WORKORDER_SYSTEMS_OAUTH_ENABLE_DEV_DEMO",
] as const;

describe("isOAuthDevDemoEnabled", () => {
  const initialNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    for (const k of keys) {
      delete process.env[k];
    }
    process.env.NODE_ENV = initialNodeEnv;
  });

  it("defaults to true when NODE_ENV is development and vars unset", () => {
    process.env.NODE_ENV = "development";
    expect(isOAuthDevDemoEnabled()).toBe(true);
  });

  it("defaults to false when NODE_ENV is production and vars unset", () => {
    process.env.NODE_ENV = "production";
    expect(isOAuthDevDemoEnabled()).toBe(false);
  });

  it("respects OAUTH_ENABLE_DEV_DEMO=true in production", () => {
    process.env.NODE_ENV = "production";
    process.env.OAUTH_ENABLE_DEV_DEMO = "true";
    expect(isOAuthDevDemoEnabled()).toBe(true);
  });

  it("respects OAUTH_ENABLE_DEV_DEMO=false in development", () => {
    process.env.NODE_ENV = "development";
    process.env.OAUTH_ENABLE_DEV_DEMO = "false";
    expect(isOAuthDevDemoEnabled()).toBe(false);
  });

  it("accepts WORKORDER_SYSTEMS_OAUTH_ENABLE_DEV_DEMO alias", () => {
    process.env.NODE_ENV = "production";
    process.env.WORKORDER_SYSTEMS_OAUTH_ENABLE_DEV_DEMO = "1";
    expect(isOAuthDevDemoEnabled()).toBe(true);
  });
});
