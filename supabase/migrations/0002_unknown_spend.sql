-- Missing cycle cost must never be classified as on plan.
create or replace view budget_pacing with (security_invoker=true) as
 select b.id,b.ref,a.name,a.currency,b.period_start,b.period_end,b.budget_cents,s.period_end as measured_through,s.cost_cents,
 b.budget_cents-s.cost_cents remaining_cents,
 case when s.cost_cents is not null then round(s.cost_cents::numeric/(s.period_end-b.period_start+1)*(b.period_end-b.period_start+1))::bigint end projected_cents,
 case when s.period_end<b.period_end then round((b.budget_cents-s.cost_cents)::numeric/(b.period_end-s.period_end))::bigint end required_daily_cents,
 case when s.id is null then 'missing cycle data' when s.cost_cents is null then 'missing cycle spend' when current_date-s.period_end>2 then 'stale export' when s.cost_cents::numeric/(s.period_end-b.period_start+1)*(b.period_end-b.period_start+1)>b.budget_cents*1.1 then 'above plan' when s.cost_cents::numeric/(s.period_end-b.period_start+1)*(b.period_end-b.period_start+1)<b.budget_cents*0.9 then 'below plan' else 'on plan' end review,
 b.approved_by,b.approval_evidence
 from budget_plans b join accounts a on a.id=b.account_id
 left join lateral(select * from snapshots s where s.account_id=a.id and s.period_start=b.period_start and s.period_end<=b.period_end order by s.period_end desc limit 1)s on true;
