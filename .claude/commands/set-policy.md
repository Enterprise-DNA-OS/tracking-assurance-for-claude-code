# /set-policy

<event> --owner=name --purpose=text --retention-days=30 --consent-required=true --actor=name

Read CLAUDE.md. Run `npm run tracking -- set-policy` with the arguments shown by `npm run tracking -- help`. Every command accepts `--json`.

Resolve names from current records first. List ambiguous matches and ask which record the operator means. For writes, use the operator's actual instruction, an explicit actor and their supplied facts. Never guess consent, a purpose, a rule, a resolution or a captured result. Imports need a test run and count reconciliation. Read the replace guide before importing.

Present the result in plain words. A release review describes recorded evidence and does not deploy or approve a release. Draft commands write under `drafts/` and never send. Keep private records and exports out of git.
