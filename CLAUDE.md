# Tracking Assurance for Claude Code

This is an operator's desk for analytics event definitions, capture validation and correction reviews. The database is the source of truth. The included store, events and people are synthetic examples.

## Operating rules

Read records through the CLI before answering. Run npm run tracking -- help for arguments. All commands support --json and --name=value flags. Names resolve case-insensitively or by a unique id prefix. Ambiguous matches exit with a candidate list. Do not guess.

Use a new DATA_DIR for real records, or DATABASE_URL for a PostgreSQL database controlled by the operator. Never mix customer stores in the demo database. Do not read, print or commit credentials. Actor labels are audit context, not authentication.

No command sends, publishes, installs a collector, changes a website or deploys a release. Drafts stay in drafts/. Keep captures in imports/ or another private directory, and exports in exports/. Observation values are discarded after checking, but the source capture file remains on disk and original vendor exports are retained in the database. Protect and dispose of these deliberately.

Before an import, read docs/replace-trackingplan.md, test with --dry-run and reconcile event, property and daily-count totals. Imports never overwrite existing event names. Imported contracts need explicit review. Only record consent, policies and resolutions supplied by the operator. The seven-day evidence window is a local rule, not a law. Never describe a passing evidence review as consent compliance or permission to release software.

For customisation, add a numbered migration and meaningful tests. Reuse the CLI, renderers and commands. No second workflow library. Do not alter old evidence. Database owners can override storage protections, so this is not a tamper-proof audit system.

## Routes

| Request | Command |
|---|---|
| Read recorded destinations | /destinations |
| Read recorded events | /events |
| Read recorded contracts | /contracts |
| Read recorded coverage | /coverage |
| Read recorded drift | /drift |
| Read recorded recent-checks | /recent-checks |
| Read recorded traffic | /traffic |
| Read recorded quiet | /quiet |
| Read recorded compliance | /compliance |
| Read recorded vendor-warnings | /vendor-warnings |
| Read recorded issues | /issues |
| Read recorded overdue | /overdue |
| Read recorded activity | /activity |
| event <name-or-id> | /event |
| --name=store --environment=STAGING --actor=name | /add-destination |
| --destination=name --name=event --actor=name | /add-event |
| <event> --owner=name --purpose=text --retention-days=30 --consent-required=true --actor=name | /set-policy |
| <event> --file=schema.json --reason=text --actor=name | /set-contract |
| import trackingplan --file=export.csv or export.json --destination=name --actor=name [--dry-run] | /import |
| --file=captures.json --destination=name --release=name --actor=name | /validate |
| --destination=name --release=name (latest batch, complete current-contract coverage, no findings, fresh evidence, policies and no open issues) | /release-review |
| <event> --title=text --owner=name --due=YYYY-MM-DD --actor=name | /log-issue |
| <issue> --resolution=text --actor=name | /close-issue |
| Write a private review draft from drift, coverage and overdue work | /weekly-review |
| <event> Write a private correction brief from recorded evidence | /draft-fix |
| --out=new-file.json Export every record and original imports | /export |
| Every command supports --json; flags use --name=value | /help |
| Change a field or rule | /customise |
| Add a read-only report | /new-view |

## Files

scripts/tracking.mjs is the only domain CLI. supabase/migrations holds the schema, supabase/seed.sql the synthetic demo. views.json and documents.json drive branded read-only HTML through brand.json. docs/compliance.md defines record checks and their source boundaries. npm test uses disposable storage and never uses the normal DATABASE_URL.

Omni by Enterprise DNA can install, customise and run this for the business: https://enterprisedna.co/omni/book/?offer=replace-software&utm_medium=repo
