# Target selection and sources

Checked 2026-11-07. Trackingplan belongs to the unused analytics-tracking-assurance family. Product analytics counts behaviour; this desk checks whether the definitions and captured events used for that reporting agree. It is distinct from test-data masking, the first target of this nightly run.

The [vendor pricing page](https://www.trackingplan.com/pricing) lists Enterprise from EUR2,000 per month with an annual commitment, equivalent to EUR24,000 per year before VAT. This is a published plan floor, not an actual customer invoice or a promise of savings. Starter and Growth are below the annual-bill filter at their base levels. Enterprise is the target tier.

Scores in order: annual bill 3, data-shaped 5, buyer evidence 1, search demand 2, buildable 5, import 5. Total 21/30. There is no verified EDNA buyer or actual invoice in the local records reviewed. Search demand is a qualitative assessment of pricing and alternatives results, not measured volume. Do not convert those gaps into claims.

Other candidates considered: pganalyze 19/30 (2,4,1,2,5,5), with a multi-server annual cost scenario rather than a single published five-figure plan; KaiNexus did not clear the verified-bill filter because its current pricing is quote-only; MPPI Optimum has industry relevance but no export shape was verified; Greenlight Guru was rejected because of regulated responsibility. The chosen family was absent from all target files before registration.

## Primary sources

- [Trackingplan pricing](https://www.trackingplan.com/pricing): monthly plan floors, annual Enterprise commitment, volume billing and compliance packaging.
- [Export API](https://www.trackingplan.com/docs/trackingplan-export-api): local JSON or CSV import path.
- [OpenAPI model](https://app.swaggerhub.com/apis-docs/Trackingplan/Trackingplan/1.0.0): provider-grouped events, property fields, daily counts and warnings. Machine-readable definition: https://api.swaggerhub.com/apis/Trackingplan/Trackingplan/1.0.0.
- [CSV sharing](https://www.trackingplan.com/docs/sharing): exports include daily event hits, property types and required constraints.
- [JSON Schema menu](https://www.trackingplan.com/docs/export-import-json-schemas): a separate export format; not claimed as accepted by this importer.
- [Privacy principle 1](https://www.privacy.org.nz/privacy-principles/1/) and [principle 9](https://www.privacy.org.nz/privacy-principles/9/): purpose and retention review, with the limits in compliance.md.

All demo data and screenshots of command output come from the local synthetic seed. No customer names, data or claims are published. The build supports local checking of supplied captures; it does not claim continuous monitoring or feature parity.
