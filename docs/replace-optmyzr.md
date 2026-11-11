# Move the account review desk from Optmyzr

This covers the All Accounts Dashboard CSV, not a whole-service export. Sources checked 11 November 2026: [dashboard guide](https://help.optmyzr.com/en/articles/7892969-all-accounts-dashboard-user-guide) and [supported export columns](https://help.optmyzr.com/en/articles/3075055-all-accounts-dashboard-faqs).

## Export

1. Save the reporting date range as the default Optmyzr view. The export uses that saved default range. Record its exact start and end dates.
2. Select one platform at a time. The documented export does not supply a dependable platform field, so the import requires it explicitly.
3. Download the current page as CSV. Set the page size to cover the accounts you need, or export all pages through Optmyzr's delivery option. This desk sends nothing.
4. Preserve an untouched copy outside Git. Inspect the header and currency columns. Use the same conversion definition when comparing periods.

## Import

```bash
node scripts/paid-search.mjs import optmyzr --file=imports/accounts.csv --platform=google --from=2026-11-01 --to=2026-11-10 --dry-run
```

Review the counts and dates; remove --dry-run to commit the authorised import. Use a separate file for each platform. Required headers are Account Id, Account Name, Currency and Cost. Empty metrics remain unknown. The importer rejects malformed CSV, duplicate account IDs within a file, negative or invalid numbers, changed currencies, future date ranges and invalid quality scores. Failure rolls back the whole file. Dates are calendar dates as exported, not converted to the operator's time zone.

| Export field | Stored record |
|---|---|
| Account Id, Account Name, Currency | Account identity, name and currency; identity includes the platform |
| Account Owner | Initial local owner only; later imports preserve local ownership |
| Tags, Notes | Vendor tags and notes, refreshed on repeat import |
| Cost, Impr, Clicks | Snapshot cost in cents, impressions and clicks |
| Conv, Conv Val | Fractional conversions and conversion value in cents |
| Monthly Budget | Reported vendor budget; never silently treated as an approved local plan |
| Quality Score | Reported score, not a calculated score |
| Every original column | raw_export retains the full CSV row for inspection and export |

Names are matched case-insensitively. Impressions, Conversions, Conversion Value and Owner are supported aliases. For other headers, create a JSON mapping such as {"Account Name":"Client label"} and pass --map=imports/headers.json. Values must use dot decimals; commas may group thousands. Money is limited to two decimal places. Missing values, -- and N/A are unknown.

Repeating a platform/account/date-window import updates that snapshot, not a second copy. Different windows remain separate. Overlapping exports are never added. Budget pacing requires a snapshot beginning exactly on the approved cycle start. Create local budgets with actual approval evidence; a reported monthly budget is only source context.

## Reconcile before retiring anything

Compare account counts, platform IDs, currencies and exact date windows with the original export. Compare cost totals within each currency and window, then sample fractional conversions, blank values and notes. The included fixture is synthetic, using documented headers; no actual customer file has been tested.

The vendor says this CSV omits tasks, audit scores, alerts, suggestions and several custom metrics. Raw rows cannot restore something absent from the export. The desk does not reconstruct campaign structures, advertisements, keywords, rules, users, connectors or change history. Bring local action history separately with verified evidence. Approved platform connections and custom screens are scoped work for Enterprise DNA.

Keep live monitoring and bidding available until replacements have been agreed and tested. You can switch the exported account-review working set in one command; that is not a promise to migrate every Optmyzr feature in one day.

## Back out and move on

Export all records with `node scripts/paid-search.mjs export --dir=exports/backup-name`. The directory must be new. The JSON snapshot includes full audit history and all original columns. Restore into an empty migrated database with `node scripts/paid-search.mjs restore --file=exports/backup-name/snapshot.json`. CSV copies are for inspection; JSON is the lossless restore format. Protect both. Import spreadsheet text safely so formula-looking vendor notes are not executed.
