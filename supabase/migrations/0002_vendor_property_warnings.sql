create or replace view v_vendor_warnings as
 select e.id,e.name,d.name destination,w.value warning,''::text property
 from events e join destinations d on d.id=e.destination_id
 cross join lateral jsonb_array_elements(coalesce(e.source->'warnings','[]')) w
 union all
 select e.id,e.name,d.name destination,w.value warning,p.value->>'property_name' property
 from events e join destinations d on d.id=e.destination_id
 cross join lateral jsonb_array_elements(coalesce(e.source->'properties','[]')) p
 cross join lateral jsonb_array_elements(coalesce(p.value->'warnings','[]')) w;
revoke all on v_vendor_warnings from public;
