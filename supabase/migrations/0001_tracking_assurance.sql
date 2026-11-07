create function touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create function immutable_record() returns trigger language plpgsql as $$ begin raise exception 'Evidence is append-only'; end $$;
create table destinations (
 id uuid primary key default gen_random_uuid(), name text not null unique check(length(trim(name))>0),
 environment text not null check(length(trim(environment))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table events (
 id uuid primary key default gen_random_uuid(), destination_id uuid not null references destinations(id),
 name text not null check(length(trim(name))>0), owner text not null default '', purpose text not null default '',
 retention_days integer check(retention_days between 1 and 3650), consent_required boolean not null default true,
 source jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(destination_id,name)
);
create table contracts (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references events(id), revision integer not null check(revision>0),
 schema jsonb not null, needs_review boolean not null default false, author text not null check(length(trim(author))>0),
 reason text not null check(length(trim(reason))>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(event_id,revision)
);
create table imports (
 id uuid primary key default gen_random_uuid(), destination_id uuid not null references destinations(id), digest text not null,
 source_format text not null, source_content text not null, imported_count integer not null, actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(destination_id,digest)
);
create table check_runs (
 id uuid primary key default gen_random_uuid(), destination_id uuid not null references destinations(id), release text not null check(length(trim(release))>0),
 digest text not null, actor text not null, sample_count integer not null check(sample_count>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table observations (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references check_runs(id), event_id uuid references events(id),
 contract_id uuid references contracts(id), event_name text not null, observed_at timestamptz not null,
 consent text not null check(consent in ('granted','denied','unknown')), shape jsonb not null, findings jsonb not null,
 sample_digest text not null, policy_digest text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table issues (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references events(id), title text not null check(length(trim(title))>0),
 owner text not null check(length(trim(owner))>0), due_on date not null, status text not null default 'open' check(status in ('open','closed')),
 resolution text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status='open' or length(trim(resolution))>0)
);
create table activity (
 id uuid primary key default gen_random_uuid(), actor text not null, action text not null, record_id uuid not null, details jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
do $$ declare t text; begin
 foreach t in array array['destinations','events','contracts','imports','check_runs','observations','issues','activity'] loop
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
 execute format('create trigger touch before update on %I for each row execute function touch_updated_at()',t);
 end loop;
 foreach t in array array['contracts','imports','check_runs','observations','activity'] loop
 execute format('create trigger immutable before update or delete on %I for each row execute function immutable_record()',t);
 end loop;
end $$;
create view v_contracts as
 select distinct on (event_id) * from contracts order by event_id,revision desc;
create view v_events as
 select e.id,e.name,d.name destination,d.environment,e.owner,e.purpose,e.retention_days,e.consent_required,c.revision,c.needs_review
 from events e join destinations d on d.id=e.destination_id left join v_contracts c on c.event_id=e.id;
create view v_coverage as
 select e.id,e.name,d.name destination,c.revision,c.needs_review,
 count(o.id) filter(where o.contract_id=c.id)::integer current_samples,
 max(o.observed_at) filter(where o.contract_id=c.id) last_observed,
 count(o.id) filter(where jsonb_array_length(o.findings)>0 and o.contract_id=c.id)::integer failed_samples
 from events e join destinations d on d.id=e.destination_id left join v_contracts c on c.event_id=e.id
 left join observations o on o.event_id=e.id group by e.id,d.name,c.id,c.revision,c.needs_review;
create view v_drift as
 select o.id,r.release,d.name destination,o.event_name,o.observed_at,f.value->>'code' code,f.value->>'path' property,f.value->>'message' finding
 from observations o join check_runs r on r.id=o.run_id join destinations d on d.id=r.destination_id
 cross join lateral jsonb_array_elements(o.findings) f;
create view v_overdue as select i.id,e.name event,i.title,i.owner,i.due_on,current_date-i.due_on days_overdue
 from issues i join events e on e.id=i.event_id where i.status='open' and i.due_on<current_date;
create view v_compliance as
 select e.id,e.name,'PURPOSE' rule,'Record collection purpose' finding from events e where trim(e.purpose)=''
 union all select id,name,'OWNER','Assign a responsible owner' from events where trim(owner)=''
 union all select id,name,'RETENTION','Set a justified retention period' from events where retention_days is null
 union all select e.id,e.name,'REVIEW','Review imported rules before relying on validation' from events e left join v_contracts c on c.event_id=e.id where c.id is null or c.needs_review
 union all select o.id,o.event_name,'RETENTION-REVIEW','Evidence exceeds the configured retention period; review disposal and backups'
 from observations o join events e on e.id=o.event_id where o.created_at < now()-e.retention_days*interval '1 day';
create view v_vendor_warnings as
 select e.id,e.name,d.name destination,w.value warning from events e join destinations d on d.id=e.destination_id
 cross join lateral jsonb_array_elements(coalesce(e.source->'warnings','[]')) w;
create view v_traffic as
 select e.id,e.name,d.name destination,h.key as hit_day,(h.value::text)::bigint hits from events e
 join destinations d on d.id=e.destination_id cross join lateral jsonb_each(coalesce(e.source->'daily_hits_data','{}')) h;
revoke all on v_contracts,v_events,v_coverage,v_drift,v_overdue,v_compliance,v_vendor_warnings,v_traffic from public;
