# Recordkeeping checks

Sources checked 11 November 2026. These checks support an operator's review. They do not certify compliance, inspect real account permissions or establish legal authority to publish advertising.

| Rule | Check in this desk | Source and scope |
|---|---|---|
| ACCESS-REVIEW | Missing or overdue account access-review date | [NZ Privacy Act principle 5](https://www.privacy.org.nz/privacy-principles/5/) requires reasonable safeguards for personal information. A date is a prompt to inspect actual permissions, not proof of those safeguards. |
| RETENTION-REVIEW | Missing purpose, missing review date or overdue retention review | [NZ principle 9](https://www.privacy.org.nz/privacy-principles/9/) limits retention to the lawful purpose. [Australian APP 11 guidance](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information) addresses security and destruction or de-identification when no longer needed, subject to exceptions. Determine which obligations apply to your organisation. |
| OWNER | Missing accountable operator | Local agency operating policy, not a statutory rule. |
| Approval evidence | A proposed action needs a named decision maker and evidence before approval. Completion needs evidence and prior approval. | Local agency change-control policy, not statutory authorisation or external campaign execution. |
| Freshness and pacing | Two days before an export is stale; ten percent above or below an approved plan triggers review. | Local operating defaults. Neither interval is prescribed by privacy law. |

Review dates are supplied by the operator. Log who checked access, what they checked and the evidence, then update the next due date. Retention review includes raw exports, notes, audit copies and backups. Record the lawful purpose and applicable retention requirements; do not delete a record merely because this check lists it.

Use aggregate account exports. Do not load customer lists or audience identifiers. Exported notes can still contain personal information. Restrict file and database access, use encrypted storage and backups, and review sharing before distributing a draft. The database owner sees all records; this base has no authenticated per-client isolation. Public database grants are revoked and row-level security is enabled without public policies. The audit log is a trace for operators, not tamper-proof evidence or verified human identity.
