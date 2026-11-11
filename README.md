# Paid Search for Claude Code

Account exports, budget decisions and agency follow-through in a database you own. Built by Enterprise DNA. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free MIT source. Install and run the demo. | Your reporting rules, review steps and Optmyzr data mapped across. | Installed, connected and operated through Omni by Enterprise DNA. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=optmyzr&utm_medium=readme) | [Setup fee, then a retainer](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=optmyzr&utm_medium=readme-managed) |

## What it runs

The morning account review, budget-pacing meeting, zero-conversion check, change-approval queue and Monday follow-through. The desk uses exported account evidence. Local approvals record a decision; they never change a campaign. Retain live bidding and monitoring until their replacement is agreed and tested.

Optmyzr's published Premium price at its 500K spend band is AU$899 per month on monthly billing for NZ and Australian customers, or AU$10,788 across twelve monthly payments. This is a published tier, not a verified customer invoice or the annual-prepayment price. [Pricing](https://www.optmyzr.com/pricing/) and [billing currency](https://help.optmyzr.com/en/articles/11503422-subscription-overages-and-billing-faqs), checked 11 November 2026.

## Quick start

Node.js 22 or newer. The local demo needs no database service or advertising login.

```bash
git clone https://github.com/Enterprise-DNA-OS/paid-search-for-claude-code.git
cd paid-search-for-claude-code
npm install
npm test
npm run demo
npm run view
npm run docs
```

Ask your coding agent for `/morning-review`. The demo has three fictional accounts, an above-plan projection, a zero-conversion account, a stale export, overdue actions and overdue recordkeeping reviews. Dates move with the first seed; seeding again preserves your changes.

For real records, choose a separate empty DATA_DIR and run `npm run migrate` without seeding. DATABASE_URL selects a shared Postgres database; otherwise PGlite stores records locally. The same SQL runs on both. This is a trusted operator's desk. It has no individual-user authentication or client portal. Row-level security and revoked public grants close public database access; they do not separate clients from a database owner. Use separate databases for separate trust groups.

## Everyday commands

- `/accounts`: List the accounts and owners.
- `/performance`: Read the latest export window for each account.
- `/budget-pacing`: Review straight-line spend projections against approved cycle budgets.
- `/zero-conversions`: Find spending accounts with explicitly zero conversions.
- `/stale-exports`: Find accounts whose evidence is missing or more than two days old.
- `/approval-queue`: Prepare proposed changes for the owner to review.
- `/overdue-actions`: Follow up unfinished work past its due date.
- `/actions`: List the work and its decision status.
- `/compliance`: Check access-review dates, retention-review dates, purpose and ownership.
- `/attention`: Read the combined queue of data, budget, work and recordkeeping issues.
- `/morning-review`: Run the morning agency account review.
- `/notes`: Read the account notes.
- `/audit`: Read the most recent changes with before-and-after records.
- `/currency-totals`: Total accounts only within the same currency and reporting window.
- `/missing-metrics`: Find missing cost, conversion or value evidence.
- `/report-pack`: Read one account and its full performance, budget, action and note history.
- `/weekly-review`: Prepare Monday decisions from budget pacing, approval queue and overdue actions.
- `/add`: Add the verified account, approved budget or proposed action the operator supplied.
- `/update`: Read the account, then change its local owner, purpose or review dates.
- `/approve`: Record the operator-supplied decision and its evidence.
- `/complete`: Record evidence that an approved action was completed outside this desk.
- `/reject`: Reject a proposed action with the supplied reason.
- `/log`: Append the operator-supplied account note.
- `/draft-report`: Create an account review working paper for human review.
- `/draft-weekly-review`: Create the weekly decision paper in drafts.
- `/import`: Read the replace guide, check the export dates and platform, then test the import.
- `/export`: Write a full private backup to a new directory.
- `/restore`: Restore a full backup into an empty migrated database.
- `/customise`: Add a field or change a local rule through a tested migration.
- `/new-view`: Add a read-only report answering an operator's question.

The CLI is `node scripts/paid-search.mjs`. Every route accepts --json. Exact references, partial IDs and case-insensitive names work; ambiguous names list the matches and exit one. `help` prints syntax. Monetary output ending in _cents is integer minor units in the stated account currency. CPA is cost divided by fractional conversions; a zero or unknown denominator produces unknown, not a fabricated ratio.

## Switch your working records in a day

Save the intended date range as the default view in Optmyzr, export each platform separately from the All Accounts Dashboard, and run:

```bash
node scripts/paid-search.mjs import optmyzr --file=imports/accounts.csv --platform=google --from=2026-11-01 --to=2026-11-10 --dry-run
```

Review counts and dates, then remove --dry-run to apply. One command imports the documented account CSV fields. Repeat imports replace the same account/window, retain raw columns and preserve local ownership and approval decisions. [The replace guide](docs/replace-optmyzr.md) explains the mapping, optional header map and what the export omits. The fixture is synthetic and uses documented column names. No real customer export has been tested.

## Budget arithmetic you can inspect

Create an approved budget with explicit cycle dates, integer budget_cents, decision maker and evidence. Only a snapshot starting on that exact cycle-start date can feed the projection. We select the latest matching snapshot within the cycle, never add overlapping exports. Projected spend is reported spend divided by elapsed cycle days, multiplied by total cycle days. It is a straight-line scenario, not a prediction that knows weekday patterns or future bids. The ten percent review band and two-day stale threshold are local defaults. Stale exports stay visibly stale. There is no currency conversion. Totals group by both currency and exact reporting window.

## Ten questions answered from your evidence

These are working questions this desk answers today, not a claim that Optmyzr cannot answer them through its broader products.

1. Which accounts need a decision this morning? (`/morning-review`)
2. Which approved cycles project above their budget? (`/budget-pacing`)
3. Where has spend produced no recorded conversions? (`/zero-conversions`)
4. Which account evidence is too old for a decision? (`/stale-exports`)
5. Which proposed changes still need an owner decision? (`/approval-queue`)
6. Who owns the unfinished work that is already late? (`/overdue-actions`)
7. Which accounts are missing a retention or access review? (`/compliance`)
8. What can we total without mixing currencies or reporting windows? (`/currency-totals`)
9. Where are conversions unknown rather than zero? (`/missing-metrics`)
10. What changed in the records, and what did they say before? (`/audit`)

## Your first hour: ten things to ask for

1. Show the morning queue with each issue's account.
2. Explain the above-plan projection and its measurement dates.
3. Show the account with spend and zero recorded conversions.
4. Find the Australian account whose export needs refreshing.
5. List the two overdue actions and their owners.
6. Read the evidence behind a proposed budget discussion.
7. Record my approval after I supply the decision maker and evidence.
8. Draft the account review with our business name.
9. Show which access and retention reviews need completing.
10. Add a business-unit field and a read-only review by unit.

## Documents and views

`npm run docs` renders an account performance review and a campaign change brief from current records. `npm run view` renders the morning desk, budget review and approval meeting. Change brand.json to set your business name, colours and logo. All generated HTML is private, read-only and ignored by Git. A draft is a working paper, not permission to share it.

## Backups and evidence

`export --dir=exports/backup-name` writes all business records and audit history as JSON plus CSV. `restore --file=exports/backup-name/snapshot.json` requires an empty migrated database and preserves the original records and audit history. Tests prove the round trip. Export folders must be new to avoid overwriting a backup. CSV retains raw text: import untrusted exports as text in spreadsheet software, never execute formula-looking values. Audit before-and-after records track changes, but do not authenticate the human operator and are not tamper-proof.

## Recordkeeping

[Compliance rules](docs/compliance.md) cite NZ privacy principles and Australian APP 11, distinguish those obligations from local review dates, and describe what the checks can prove. No tracking pixels, audiences, customer lists, payments, ad placements or sending functions are included. Account notes and raw exports still need access and retention decisions.

## Validation

`npm test` uses disposable databases and exercises every CLI route, import rollback and repeat imports, exact-cycle arithmetic, unknown metrics, approvals, HTML escaping and complete backup restoration. CI runs Node 22 on Linux and Windows and a separate PostgreSQL service test. Only completed workflow results prove those hosted platforms passed.

## Installed and operated

Enterprise DNA maps your exports, builds your reporting rules, approved platform connections and team screens, and operates the system through **Omni by Enterprise DNA**. One setup fee, then a retainer. [Spend 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=optmyzr&utm_medium=readme-closing).

MIT licence. Optmyzr is a separate product. This project is not affiliated with Optmyzr.
