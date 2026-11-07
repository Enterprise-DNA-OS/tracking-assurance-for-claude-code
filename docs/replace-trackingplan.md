# Switch the tracking assurance desk from Trackingplan

Sources checked 2026-11-07: [Sharing and CSV export](https://www.trackingplan.com/docs/sharing), [Export API](https://www.trackingplan.com/docs/trackingplan-export-api), [vendor OpenAPI definition](https://app.swaggerhub.com/apis-docs/Trackingplan/Trackingplan/1.0.0).

## Export one destination

Use Trackingplan's export menu for CSV, or save a JSON response from its documented public/export/v1 API. Export one provider/destination and environment at a time. Its API defaults to production. The operator performs the authenticated export in their own account. Do not paste a sharing token into chat or commit it.

The separate JSON Schema menu is a different format. This importer accepts the Export API object with events grouped by provider, not that menu's JSON Schema file. CSV headers must include Destination, Event Name, Property Name, Type and Presence. Event rows have a blank Property Name. Date columns hold daily hit counts. Descriptions, status, warnings and property-level daily counts remain in the original record. The synthetic fixture follows the vendor's published headers; it is not a downloaded customer export.

## Bring it across

```sh
npm run tracking -- add-destination --name=store-ga4 --environment=PRODUCTION --actor=operator
npm run tracking -- import trackingplan --file=imports/trackingplan.csv --destination=store-ga4 --actor=operator --dry-run
npm run tracking -- import trackingplan --file=imports/trackingplan.csv --destination=store-ga4 --actor=operator
```

The final line is the one-command import after creating the destination. For JSON, use a .json filename. The supplied destination names the site and provider and records the exported environment. Do not combine websites or environments under one destination. Multi-provider files are rejected instead of merged. A JSON export environment must match the chosen destination, and later imports must use its existing provider. Count reconciliation remains necessary because the CSV does not identify the account or environment.

The import is atomic. Unknown columns and original bytes remain in source records. Identical imports are skipped. Conflicting existing event names cause a failure with no writes, so an export cannot replace local reviewed rules. Use a fresh destination to compare a changed export, then explicitly update the intended event contracts.

## Reconcile and review

Read events, event, contracts, traffic and vendor-warnings. Compare event and property counts, required flags, types, dates and hit totals with your account. Inspect each event's preserved source where property-level counts or warnings matter. Blank numeric cells are absent data, not zero. Invalid dates, counts and duplicate properties fail the entire import.

All imported contracts start as needing review. Exported regex and enum type labels do not include their exact values or expressions in the documented Export API shape. Set the complete local JSON Schema using set-contract with a reason and actor, then set-policy for owner, purpose, retention and consent. Arbitrary vendor validation functions are not executed. Review those manually. Contract revisions stay in history.

Historical sessions, raw payloads, visitor journeys, cookie scans, pixel requests, notification settings and integrations are not reconstructed by the export. Enterprise DNA can map additional records and build collection connections into a custom version. Keep Trackingplan operating until the required collection, checking and alerting work has been reconciled. Do not cancel it because a definition import alone succeeded.

## Ongoing operation without the vendor

Use add-event and set-contract to maintain definitions. Validate captures saved by your test process using the format in the README. No vendor subscription or token is needed to run the local desk. Any ongoing automated collection must be supplied or built separately. A day is enough to trial the exported definitions, not a promise that every monitoring connection can be replaced in a day.
