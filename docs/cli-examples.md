# Working examples

All values below are fictional. Supply real decisions yourself; do not copy example approval evidence into operating records.

```bash
node scripts/paid-search.mjs add account --data='{"ref":"SHOP","name":"Example Search","platform":"google","external_id":"123-456-7890","currency":"NZD","owner":"Ari"}'
node scripts/paid-search.mjs add budget --data='{"ref":"NOV","account":"SHOP","period_start":"2026-11-01","period_end":"2026-11-30","budget_cents":300000,"approved_by":"Example owner","approval_evidence":"Fictional signed brief"}'
node scripts/paid-search.mjs add action --data='{"ref":"REVIEW","account":"SHOP","title":"Review budget","owner":"Ari","due_date":"2026-11-15","proposed_change":"Discuss allocation","rationale":"Projection needs review"}'
node scripts/paid-search.mjs approve REVIEW --by="Example owner" --evidence="Fictional approval"
node scripts/paid-search.mjs complete REVIEW --evidence="Fictional completed review"
node scripts/paid-search.mjs update SHOP --data='{"purpose":"Aggregate performance review","access_review_due":"2026-12-01","retention_review_due":"2027-02-01"}'
```

Use JSON quoting appropriate to your shell. Values supplied with --data are validated against the fields for that record. There is no generic SQL execution or campaign-change endpoint in the CLI.
