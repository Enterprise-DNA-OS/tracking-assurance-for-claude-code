# Record checks and their boundaries

Checked 2026-11-07. These checks support a privacy review; they do not certify legal compliance or determine whether a particular collection is lawful.

| Check | Implemented behaviour | Basis |
|---|---|---|
| PURPOSE | Flags an event with no recorded collection purpose | NZ Privacy Act principle 1 requires a lawful connected purpose and necessary collection. [Privacy Commissioner](https://www.privacy.org.nz/privacy-principles/1/) |
| RETENTION | Flags a missing retention period and evidence older than the chosen period | NZ principle 9 limits retention to what is necessary for lawful use. It sets no universal number of days. [Privacy Commissioner](https://www.privacy.org.nz/privacy-principles/9/) |
| PERSONAL-FIELD | Flags common personal-data property names, including nested fields | Local minimisation review prompted by principle 1. This name-based check is incomplete and does not inspect meaning or identify all personal data. |
| CONSENT | Flags denied or unknown consent when the event's local policy requires granted consent | A local operating rule. Consent labels are supplied evidence, not verified browser behaviour and not a universal legal requirement. |
| OWNER and REVIEW | Flags missing ownership and unreviewed contracts | Local operational accountability rules, not statutory tests. |
| Release evidence | Requires current contracts and policies, fresh complete coverage and no unresolved findings or corrections | Local release-review policy. Seven days is a configurable operating choice, not a statutory period. |

No health, financial or regulated safety decision is delegated to this desk. Operators remain responsible for applicable jurisdictions, notices, lawful purposes, consent design and retention schedules. The tool has no automatic deletion path. It flags records for deliberate disposal review, including consideration of original exports, source captures and backups. An empty compliance report is not a legal conclusion.

## Storage

Captured property values are read only for local validation and are not inserted into observations. Hashes and property names can still be identifying. Original imported exports remain intact and may include personal information in warning examples. Keep the database and input files private. Row-level security and revoked public access do not authenticate the CLI operator. This repo uses a trusted owner role and is not a multi-tenant service.
