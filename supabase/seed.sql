do $$ declare a uuid; b uuid; c uuid; start_day date:=current_date-10; end_day date:=current_date+19; begin
 if exists(select 1 from accounts where ref='DEMO-SEARCH') then return; end if;
 insert into accounts(ref,platform,external_id,name,currency,owner,purpose,access_review_due,retention_review_due) values('DEMO-SEARCH','google','demo-001','Harbour Outdoor Search','NZD','Mia','Aggregate campaign performance review',current_date-2,current_date+90) returning id into a;
 insert into accounts(ref,platform,external_id,name,currency,owner,purpose,access_review_due,retention_review_due) values('DEMO-SOCIAL','meta','demo-002','Harbour Outdoor Social','NZD','Mia','Aggregate campaign performance review',current_date+90,current_date+90) returning id into b;
 insert into accounts(ref,platform,external_id,name,currency,owner) values('DEMO-AU','microsoft','demo-003','Southern Parts Search','AUD','') returning id into c;
 insert into snapshots(account_id,period_start,period_end,cost_cents,impressions,clicks,conversions,conversion_value_cents,reported_budget_cents,quality_score,source) values
 (a,start_day,current_date-1,240000,18000,900,24,680000,450000,6.5,'synthetic demo'),
 (b,start_day,current_date-1,90000,22000,600,0,0,240000,null,'synthetic demo'),
 (c,start_day,current_date-5,120000,12000,400,8,280000,300000,5,'synthetic demo');
 insert into budget_plans(ref,account_id,period_start,period_end,budget_cents,approved_by,approval_evidence) values
 ('PLAN-SEARCH',a,start_day,end_day,450000,'Demo owner','Fictional signed budget brief'),
 ('PLAN-SOCIAL',b,start_day,end_day,240000,'Demo owner','Fictional signed budget brief'),
 ('PLAN-AU',c,start_day,end_day,300000,'Demo owner','Fictional signed budget brief');
 insert into actions(ref,account_id,title,owner,due_date,proposed_change,rationale) values
 ('ACT-SEARCH',a,'Review search budget trajectory','Mia',current_date-2,'Review campaign allocation with client','Latest cycle spend projects above approved plan'),
 ('ACT-SOCIAL',b,'Check social conversion definition','Leo',current_date+1,'Review conversion tracking outside this desk','Spend has no recorded conversions');
 insert into actions(ref,account_id,title,owner,due_date,proposed_change,rationale,status,approved_by,approval_evidence) values
 ('ACT-AU',c,'Refresh Australian export','Noor',current_date-3,'Download an updated account report','Latest evidence is five days old','approved','Demo owner','Fictional internal task approval');
 insert into notes(account_id,author,body) values(a,'Mia','Fictional demo. Owner requested a budget discussion before any campaign change.');
end $$;
