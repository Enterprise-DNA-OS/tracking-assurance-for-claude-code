# Tracking Assurance for Claude Code

Find broken checkout tracking, missing event properties and gaps in release evidence from records in a database you own.

## Three ways to own it

- **Do it yourself:** install the MIT-licensed base and use Claude Code, Codex, OpenCode or Cursor. Hosting and coding-agent subscriptions are separate.
- **We customise it:** Enterprise DNA maps your Trackingplan history, adds your rules and connects your capture sources. A web front end or a different stack can be part of your version. One setup fee, then a retainer for ongoing work.
- **We run it for you:** Omni by Enterprise DNA installs it, manages access and backups, prepares reviews and maintains your connections. One setup fee, then a retainer.

[Book a 30-minute call with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=trackingplan).

## Try the synthetic demo

Node 20 or newer. No cloud account is required.

```sh
npm install
npm test
npm run demo
npm run tracking -- drift
npm run tracking -- coverage
npm run tracking -- release-review --destination=demo-store --release=checkout-42
npm run view
npm run docs
```

The demo contains missing currency, a number sent as text, a consent-policy failure, an unfamiliar personal-data field, stale evidence and an overdue correction. People and business records are invented. Seeding is repeatable and preserves edits. Use a fresh DATA_DIR for real work. DATABASE_URL selects PostgreSQL; otherwise PGlite persists in .data/db.

## What works

Import one destination's Trackingplan Export API JSON or documented CSV export. Event definitions, property types, presence rules, daily counts and warnings are retained alongside the original source file. An identical file is a no-op. A changed export cannot silently overwrite existing events. Every imported contract requires explicit review, because exported type labels do not carry all the validation expressions or enum values needed to reproduce the original rules.

Review each event's JSON Schema, owner, purpose, retention period and consent requirement. Then validate a local captured-event batch. Validation checks required properties, types, enum values, bounds, patterns, extra fields and nested rules supported by JSON Schema draft-07. Unsupported dialects, unknown keywords, external references and asynchronous rules fail. It also flags unfamiliar events, unreviewed contracts, local consent-policy failures and a small named set of personal-data fields.

A release review reads the newest batch for one destination and release. It needs every defined event, the current contract revision, the same policy used during validation, captures no older than seven days, no findings and no open corrective actions. A newer failing or incomplete batch supersedes an older passing batch. This is a record check, not a deployment or legal approval. Samples cannot establish that every visitor or consent state has been tested.

## Bring captured evidence

The capture adapter accepts an array with event, observed_at (an ISO timestamp with timezone), consent (granted, denied or unknown) and properties. For example:

```json
[{"event":"purchase","observed_at":"2026-11-07T12:00:00Z","consent":"granted","properties":{"order_id":"synthetic-1","value":25,"currency":"NZD"}}]
```

```sh
npm run tracking -- validate --file=imports/captures.json --destination=demo-store --release=checkout-43 --actor=operator
```

Use actual capture times. Future or malformed times fail. Store raw captures privately. The database retains property shapes, findings, hashes and context, not captured property values. Original vendor imports can contain sensitive descriptions or warning examples and are retained intact.

This base does not install a browser collector, crawl a site, intercept network requests, send alerts, record visitor sessions or independently observe consent. Supply captures from your existing test process. Enterprise DNA can build the ongoing capture and monitoring connections into your version. Trackingplan already supplies these services and its own automated checks. This build covers the local definition, validation and correction desk; it is not feature parity with the hosted monitoring service.

## Ten questions for your own records

1. Which captured checkout events fail the current property rules? (`drift`)
2. Which events have no evidence for their current contract revision? (`coverage`)
3. Which captures conflict with our recorded consent policy? (`drift`)
4. Which property names need a personal-data review? (`drift`)
5. Which events have gone more than a week without captured evidence? (`quiet`)
6. Which imported daily counts dropped or reached zero? (`traffic`)
7. Who owns overdue tracking corrections? (`overdue`)
8. Which event definitions have no purpose or retention period? (`compliance`)
9. Does the latest release batch cover every current event contract? (`release-review --destination=demo-store --release=checkout-42`)
10. Who changed the rules or recorded a correction? (`activity`)

These are executable questions, not a claim that the vendor cannot answer them. Your own release requirements, correction history and retention rules make the answers specific to your business.

## Your first hour: ten things to ask for

1. Put our name, colours and logo in brand.json.
2. Show the demo's tracking failures.
3. Explain the blocked checkout release review.
4. Create a destination for our staging store.
5. Test one exported destination without changing records.
6. Bring its events across and reconcile the counts.
7. Review the currency and value rules for our checkout.
8. Record the purpose, owner and retention period we have agreed.
9. Validate a captured batch and draft the correction brief.
10. Export a private snapshot before adding our own field.

## Recurring jobs

- `/destinations`: Read recorded destinations
- `/events`: Read recorded events
- `/contracts`: Read recorded contracts
- `/coverage`: Read recorded coverage
- `/drift`: Read recorded drift
- `/recent-checks`: Read recorded recent-checks
- `/traffic`: Read recorded traffic
- `/quiet`: Read recorded quiet
- `/compliance`: Read recorded compliance
- `/vendor-warnings`: Read recorded vendor-warnings
- `/issues`: Read recorded issues
- `/overdue`: Read recorded overdue
- `/activity`: Read recorded activity
- `/event`: event <name-or-id>
- `/add-destination`: --name=store --environment=STAGING --actor=name
- `/add-event`: --destination=name --name=event --actor=name
- `/set-policy`: <event> --owner=name --purpose=text --retention-days=30 --consent-required=true --actor=name
- `/set-contract`: <event> --file=schema.json --reason=text --actor=name
- `/import`: import trackingplan --file=export.csv|export.json --destination=name --actor=name [--dry-run]
- `/validate`: --file=captures.json --destination=name --release=name --actor=name
- `/release-review`: --destination=name --release=name (latest batch, complete current-contract coverage, no findings, fresh evidence, policies and no open issues)
- `/log-issue`: <event> --title=text --owner=name --due=YYYY-MM-DD --actor=name
- `/close-issue`: <issue> --resolution=text --actor=name
- `/weekly-review`: Write a private review draft from drift, coverage and overdue work
- `/draft-fix`: <event> Write a private correction brief from recorded evidence
- `/export`: --out=new-file.json Export every record and original imports
- `/help`: Every command supports --json; flags use --name=value
- `/customise`: add fields or rules with a migration and tests.
- `/new-view`: add a read-only report in the same brand.

There are 27 CLI commands and 29 slash commands. All CLI commands support --json. Use --name=value flags. PowerShell users can pass files instead of embedding JSON in a command line.

## Reports, documents and operating limits

npm run view writes week, drift and coverage reports. npm run docs writes an event specification and evidence review per event, including open and completed corrections. Edit brand.json once to brand them. These are read-only HTML files, suitable for printing to PDF. weekly-review and draft-fix write private Markdown drafts.

Contracts, check runs, observations, imports and activity are append-only through triggers. Every table has row-level security and no PUBLIC privileges. The CLI is for a trusted database owner. Actor labels are not user authentication, and a database owner can bypass triggers. Production multi-user permissions, backup retention and access controls need a deployment design.

Retention checks flag evidence beyond the configured period; they do not delete evidence, raw captures, imports or backups automatically. Take database-native backups as well as JSON exports. The export contains every domain record and original imports. A restore procedure must be designed and tested for your chosen hosting.

## Verification

npm test creates disposable storage and exercises every CLI handler, idempotent seeds, both import formats, atomic rejection, ambiguous names, revision and policy invalidation, stale and incomplete evidence, privacy handling, document rendering and HTML escaping. Windows and Ubuntu jobs run Node 20 and 22. A separate PostgreSQL 16 job uses an empty disposable database. CI configuration is not proof of a completed remote run; see the run's actual checks.

Read [the switching guide](docs/replace-trackingplan.md), [compliance scope](docs/compliance.md), [why no front end](docs/why-no-front-end.md) and [research](docs/research.md).

## Licence

MIT. Copyright 2026 Enterprise DNA. Trackingplan belongs to its owner. This independent project does not copy vendor code or assets.
