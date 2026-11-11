create table accounts (
 id uuid primary key default gen_random_uuid(), ref text unique not null check(btrim(ref)<>''),
 platform text not null check(platform in ('google','microsoft','meta','amazon','linkedin','yahoo')),
 external_id text not null check(btrim(external_id)<>''), name text not null check(btrim(name)<>''),
 currency text not null check(currency ~ '^[A-Z]{3}$'), owner text not null default '', tags text not null default '', vendor_notes text not null default '',
 access_review_due date, retention_review_due date, purpose text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(platform,external_id)
);
create table snapshots (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references accounts(id),
 period_start date not null, period_end date not null check(period_end>=period_start),
 cost_cents bigint check(cost_cents>=0 and cost_cents<=9000000000000), impressions bigint check(impressions>=0), clicks bigint check(clicks>=0),
 conversions numeric(18,4) check(conversions>=0), conversion_value_cents bigint check(conversion_value_cents>=0 and conversion_value_cents<=9000000000000),
 reported_budget_cents bigint check(reported_budget_cents>=0 and reported_budget_cents<=9000000000000),
 quality_score numeric(5,2) check(quality_score between 0 and 10), raw_export jsonb not null default '{}', source text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(account_id,period_start,period_end)
);
create table budget_plans (
 id uuid primary key default gen_random_uuid(), ref text unique not null, account_id uuid not null references accounts(id),
 period_start date not null, period_end date not null check(period_end>=period_start), budget_cents bigint not null check(budget_cents>0 and budget_cents<=9000000000000),
 approved_by text not null check(btrim(approved_by)<>''), approval_evidence text not null check(btrim(approval_evidence)<>''),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(account_id,period_start)
);
create table actions (
 id uuid primary key default gen_random_uuid(), ref text unique not null, account_id uuid not null references accounts(id),
 title text not null check(btrim(title)<>''), owner text not null check(btrim(owner)<>''), due_date date not null,
 proposed_change text not null check(btrim(proposed_change)<>''), rationale text not null check(btrim(rationale)<>''),
 status text not null default 'proposed' check(status in ('proposed','approved','completed','rejected')),
 approved_by text, approval_evidence text, completion_evidence text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status not in ('approved','completed') or (nullif(btrim(approved_by),'') is not null and nullif(btrim(approval_evidence),'') is not null)),
 check(status<>'completed' or nullif(btrim(completion_evidence),'') is not null)
);
create table notes (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references accounts(id), author text not null check(btrim(author)<>''), body text not null check(btrim(body)<>''),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table audit_events (
 id uuid primary key default gen_random_uuid(), relation_name text not null, record_id uuid not null, operation text not null,
 before_record jsonb, after_record jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function stamp_record() returns trigger language plpgsql as $$ begin new.updated_at=clock_timestamp(); return new; end $$;
create function record_change() returns trigger language plpgsql as $$
begin
 insert into audit_events(relation_name,record_id,operation,before_record,after_record)
 values(TG_TABLE_NAME,coalesce(new.id,old.id),TG_OP,case when TG_OP='INSERT' then null else to_jsonb(old) end,case when TG_OP='DELETE' then null else to_jsonb(new) end);
 return coalesce(new,old);
end $$;
do $$ declare t text; begin
 foreach t in array array['accounts','snapshots','budget_plans','actions','notes'] loop
 execute format('create trigger stamp before update on %I for each row execute function stamp_record()',t);
 execute format('create trigger audit after insert or update or delete on %I for each row execute function record_change()',t);
 end loop;
 foreach t in array array['accounts','snapshots','budget_plans','actions','notes','audit_events'] loop
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
 end loop;
end $$;
create view latest_performance with (security_invoker=true) as
 select a.id account_id,a.ref,a.name,a.platform,a.currency,a.owner,s.period_start,s.period_end,s.cost_cents,s.impressions,s.clicks,s.conversions,s.conversion_value_cents,s.reported_budget_cents,s.quality_score,
 case when s.conversions>0 then round(s.cost_cents/s.conversions)::bigint end cpa_cents,
 case when s.cost_cents>0 then round(s.conversion_value_cents::numeric/s.cost_cents,3) end roas,
 (current_date-s.period_end) age_days
 from accounts a left join lateral(select * from snapshots s where s.account_id=a.id order by period_end desc,period_start desc limit 1)s on true;
create view budget_pacing with (security_invoker=true) as
 select b.id,b.ref,a.name,a.currency,b.period_start,b.period_end,b.budget_cents,s.period_end as measured_through,s.cost_cents,
 b.budget_cents-s.cost_cents remaining_cents,
 case when s.cost_cents is not null then round(s.cost_cents::numeric/(s.period_end-b.period_start+1)*(b.period_end-b.period_start+1))::bigint end projected_cents,
 case when s.period_end<b.period_end then round((b.budget_cents-s.cost_cents)::numeric/(b.period_end-s.period_end))::bigint end required_daily_cents,
 case when s.id is null then 'missing cycle data' when current_date-s.period_end>2 then 'stale export' when s.cost_cents::numeric/(s.period_end-b.period_start+1)*(b.period_end-b.period_start+1)>b.budget_cents*1.1 then 'above plan' when s.cost_cents::numeric/(s.period_end-b.period_start+1)*(b.period_end-b.period_start+1)<b.budget_cents*0.9 then 'below plan' else 'on plan' end review,
 b.approved_by,b.approval_evidence
 from budget_plans b join accounts a on a.id=b.account_id
 left join lateral(select * from snapshots s where s.account_id=a.id and s.period_start=b.period_start and s.period_end<=b.period_end order by s.period_end desc limit 1)s on true;
create view compliance_findings with (security_invoker=true) as
 select ref,name,'ACCESS-REVIEW' rule,'Record an access review and its next due date' finding from accounts where access_review_due is null or access_review_due<current_date
 union all select ref,name,'RETENTION-REVIEW','Review retention purpose and next review date' from accounts where retention_review_due is null or retention_review_due<current_date or purpose=''
 union all select ref,name,'OWNER','Assign the accountable operator' from accounts where btrim(owner)='';
create view overdue_actions with (security_invoker=true) as
 select x.ref,a.name,x.title,x.owner,x.due_date,x.status,current_date-x.due_date days_late from actions x join accounts a on a.id=x.account_id where x.status in ('proposed','approved') and x.due_date<current_date;
create view attention with (security_invoker=true) as
 select ref,name,'data' kind,case when period_end is null then 'No performance export' else 'Export is '||age_days||' days old' end issue from latest_performance where period_end is null or age_days>2
 union all select ref,name,'budget',review from budget_pacing where review<>'on plan' and period_end>=current_date
 union all select ref,name,'action',title||' ('||days_late||' days late)' from overdue_actions
 union all select ref,name,'records',finding from compliance_findings;
revoke all on latest_performance,budget_pacing,compliance_findings,overdue_actions,attention from public;
