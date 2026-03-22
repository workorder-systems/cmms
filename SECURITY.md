# Security Policy

## Project stage

The project is in **alpha**: APIs and schema change, security properties are still maturing, and you should **not** assume the same rigor as a mature GA product without your own review.

## Supported versions

Security fixes are applied to the **default branch** (`main`). This repository does **not** currently publish semver-tagged “releases” for the database or monorepo as a whole: the live contract is **migrations + tests on `main`**. The **`@workorder-systems/sdk`** package may carry its own version on npm, but schema compatibility is defined by this repo’s migrations and CI, not by a separate LTS line yet.

For a **stability matrix** (no LTS, no tags, pinning advice), see the README: [Stability and releases](README.md#stability-and-releases).

## Reporting a vulnerability
Please report security issues privately using GitHub Security Advisories:
https://github.com/workorder-systems/db/security/advisories/new

Do not open public issues or pull requests for security vulnerabilities.
If you are unsure whether something is security-related, open a normal issue.

## Response process
We aim to acknowledge reports within 5 business days and provide a remediation
plan as quickly as possible. Timelines may vary depending on severity and
complexity.
