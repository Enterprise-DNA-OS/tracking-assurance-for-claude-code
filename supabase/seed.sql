do $$
declare d uuid; e uuid; c uuid; run uuid; begin
 if exists(select 1 from destinations where name='demo-store') then return; end if;
 insert into destinations(name,environment) values('demo-store','STAGING') returning id into d;
 insert into events(destination_id,name,owner,purpose,retention_days,source) values
 (d,'purchase','Mere','Measure completed demo orders',30,'{"daily_hits_data":{"2026-11-05":120,"2026-11-06":20},"warnings":[{"type":"HIT_DROP_WARNING","message":"Synthetic drop for demonstration"}]}') returning id into e;
 insert into contracts(event_id,revision,schema,author,reason) values(e,1,'{"type":"object","properties":{"order_id":{"type":"string"},"value":{"type":"number","minimum":0},"currency":{"type":"string","enum":["NZD","AUD"]}},"required":["order_id","value","currency"],"additionalProperties":false}','demo','Initial synthetic rules') returning id into c;
 insert into check_runs(destination_id,release,digest,actor,sample_count) values(d,'checkout-42','synthetic','demo',3) returning id into run;
 insert into observations(run_id,event_id,contract_id,event_name,observed_at,consent,shape,findings,sample_digest) values
 (run,e,c,'purchase',now()-interval '1 hour','granted','{"order_id":"string","value":"string"}','[{"code":"SCHEMA","path":"/value","message":"must be number"},{"code":"SCHEMA","path":"/currency","message":"required property missing"}]','synthetic-1'),
 (run,e,c,'purchase',now()-interval '2 hours','denied','{"email":"string"}','[{"code":"CONSENT","path":"","message":"Consent required by local policy"},{"code":"PERSONAL-FIELD","path":"/email","message":"Review personal-data field"}]','synthetic-2');
 insert into issues(event_id,title,owner,due_on) values(e,'Restore currency on checkout','Ari',current_date-3);
 insert into events(destination_id,name,source) values(d,'lead_submitted','{"daily_hits_data":{"2026-11-05":10,"2026-11-06":0}}') returning id into e;
 insert into contracts(event_id,revision,schema,needs_review,author,reason) values(e,1,'{"type":"object","properties":{"lead_type":{"type":"string"}},"additionalProperties":false}',true,'demo','Imported spec needs review');
 insert into events(destination_id,name,owner,purpose,retention_days,consent_required) values(d,'page_view','Tui','Count demo visits',14,false) returning id into e;
 insert into contracts(event_id,revision,schema,author,reason) values(e,1,'{"type":"object","properties":{"path":{"type":"string"}},"required":["path"],"additionalProperties":false}','demo','Initial synthetic rules') returning id into c;
 insert into observations(run_id,event_id,contract_id,event_name,observed_at,consent,shape,findings,sample_digest)
 values(run,e,c,'page_view',now()-interval '10 days','unknown','{"path":"string"}','[]','synthetic-3');
 insert into activity(actor,action,record_id) values('demo','seed',d);
 end $$;
