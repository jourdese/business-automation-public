-- Generated from data/marinara.json. Additive seed; never resets an existing restaurant.
do $seed$
declare data jsonb:='{"version":"marinara-v2-12-1","slug":"marinara-ristorante","name":"Marinara Ristorante","notice":"Demonstration menu and recipe quantities. Confirm availability and dietary requirements with the restaurant team. No payment is collected.","ingredients":[["arugula","Arugula","kg",45000,3,0.7],["peach","Peaches","kg",24000,5,1],["pecan","Pecans","kg",95000,2,0.4],["leaves","Mixed salad leaves","kg",28000,4,1],["cranberry","Dried cranberries","kg",65000,3,0.5],["shrimp","Peeled shrimp","kg",59000,8,10],["squid","Squid","kg",36000,5,1],["mussels","Mussels","kg",24000,5,1],["pasta","Dry pasta","kg",16000,16,4],["tomato","Tomato sauce","L",24500,6,8],["cream","Cooking cream","L",28000,8,2],["mushroom","Mushrooms","kg",32000,6,1.5],["garlic","Garlic","kg",18000,3,0.5],["olive_oil","Olive oil","L",52000,6,1],["parmesan","Parmesan","kg",98000,4,1],["flour","Flour","kg",7500,25,5],["yeast","Yeast","kg",28000,1,0.15],["salt","Salt","kg",3500,3,0.5],["mozzarella","Mozzarella","kg",65000,8,2],["gorgonzola","Gorgonzola","kg",125000,2,0.5],["fontina","Fontina","kg",110000,2,0.5],["burrata","Burrata","each",22000,15,4],["basil","Fresh basil","kg",45000,0.35,0.5],["salmon","Salmon fillet","kg",105000,5,1],["lemon","Lemons","kg",18000,7,1.5],["butter","Butter","kg",52000,5,1],["vegetables","Seasonal vegetables","kg",15000,10,2],["chicken","Spring chicken","kg",22000,8,2],["herbs","Mixed herbs","kg",70000,1,0.2],["cream_cheese","Cream cheese","kg",65000,4,1],["biscuit","Biscuit crumbs","kg",22000,3,0.5],["lime","Limes","kg",24000,3,0.5],["sugar","Sugar","kg",8500,5,1],["egg","Eggs","each",950,45,12],["cucumber","Cucumber","kg",8500,5,1],["honey","Honey","kg",32000,3,0.5],["orange","Oranges","kg",15000,8,2],["water","Filtered water","L",1500,45,10]],"items":[{"code":"arugula_peach_pecan_solo","name":"Arugula with Peach & Pecan","category":"To begin","price":46500,"image":"marinara-menu-Arugula Salad with Peaches and Pecan.jpg","description":"Peppery leaves, sweet peaches and a little pecan crunch. A fresh beginning.","allergens":["Tree nuts","Milk"],"recipe":{"arugula":0.08,"peach":0.07,"pecan":0.02,"olive_oil":0.012,"lemon":0.02,"parmesan":0.012,"salt":0.001}},{"code":"shrimp_cranberry_salad_solo","name":"Shrimp & Cranberry Salad","category":"To begin","price":48500,"image":"marinara-menu-Shrimp & Cranberry Salad.jpg","description":"Tender shrimp, garden leaves and cranberries with a bright citrus dressing.","allergens":["Crustaceans"],"recipe":{"shrimp":0.09,"leaves":0.08,"cranberry":0.02,"olive_oil":0.012,"lemon":0.025,"salt":0.001}},{"code":"seafood_marinara_solo","name":"Seafood Marinara","category":"Pasta","price":56500,"image":"marinara-menu-Seafood Marinara.jpg","description":"Pasta tangled with shrimp, squid and mussels in a generous tomato sauce.","allergens":["Wheat","Crustaceans","Molluscs"],"recipe":{"pasta":0.12,"shrimp":0.06,"squid":0.06,"mussels":0.06,"tomato":0.15,"garlic":0.008,"olive_oil":0.015,"basil":0.004,"salt":0.002}},{"code":"shrimp_mushroom_alfredo_solo","name":"Shrimp & Mushroom Alfredo","category":"Pasta","price":46000,"image":"marinara-menu-Shrimp & Mushroom Alfredo.jpg","description":"A comforting bowl of creamy pasta, mushrooms and shrimp, finished with Parmesan.","allergens":["Wheat","Milk","Crustaceans"],"recipe":{"pasta":0.12,"shrimp":0.08,"mushroom":0.06,"cream":0.12,"parmesan":0.025,"butter":0.012,"garlic":0.005,"salt":0.002}},{"code":"quattro_formaggi_pizza_12","name":"Quattro Formaggi","category":"Pizza","price":68000,"image":"marinara-menu-Quattro Formaggi Pizza.jpg","description":"Four cheeses, one very good reason to share. Our 12-inch pizza for the table.","allergens":["Wheat","Milk"],"recipe":{"flour":0.18,"water":0.115,"yeast":0.003,"salt":0.003,"olive_oil":0.01,"mozzarella":0.07,"gorgonzola":0.025,"fontina":0.025,"parmesan":0.02}},{"code":"burrata_pizza","name":"Burrata Pizza","category":"Pizza","price":99900,"image":"marinara-menu-Burrata Pizza.jpg","description":"Creamy burrata meets tomato and fresh basil. Cut, share, linger.","allergens":["Wheat","Milk"],"recipe":{"flour":0.18,"water":0.115,"yeast":0.003,"salt":0.003,"olive_oil":0.012,"tomato":0.08,"mozzarella":0.05,"burrata":1,"basil":0.006}},{"code":"grilled_salmon","name":"Grilled Salmon Fillet","category":"From the kitchen","price":99500,"image":"marinara-menu-Grilled Salmon Fillet.jpg","description":"Grilled salmon with vegetables and a simple lemon-butter finish.","allergens":["Fish","Milk"],"recipe":{"salmon":0.2,"vegetables":0.15,"lemon":0.04,"butter":0.02,"olive_oil":0.012,"herbs":0.003,"salt":0.002}},{"code":"herb_spring_chicken_mushroom","name":"Herb Spring Chicken","category":"From the kitchen","price":59500,"image":"marinara-menu-Herb Spring Chicken in Mushroom.jpg","description":"Herb-seasoned chicken, mushroom cream and something warm from the kitchen.","allergens":["Milk"],"recipe":{"chicken":0.35,"mushroom":0.08,"cream":0.09,"butter":0.015,"garlic":0.008,"herbs":0.005,"vegetables":0.1,"salt":0.003}},{"code":"key_lime_cheesecake","name":"Key Lime Cheesecake","category":"Something sweet","price":22000,"image":"marinara-menu-Key Lime Cheesecake.jpg","description":"A creamy slice with a bright lime finish. Save a little room.","allergens":["Milk","Egg","Wheat"],"recipe":{"cream_cheese":0.065,"biscuit":0.025,"butter":0.012,"lime":0.025,"sugar":0.02,"egg":0.3}},{"code":"cucumber_lemon","name":"Cucumber Lemon","category":"A little refreshment","price":17500,"image":"marinara-menu-Cucumber Lemon.jpg","description":"Cool cucumber, lemon and a gently sweet finish.","allergens":[],"recipe":{"cucumber":0.08,"lemon":0.05,"sugar":0.02,"water":0.25}},{"code":"honey_lemon","name":"Honey Lemon","category":"A little refreshment","price":17500,"image":"marinara-menu-Honey Lemon.jpg","description":"A sunny glass of honey and lemon.","allergens":[],"recipe":{"honey":0.03,"lemon":0.06,"water":0.25}},{"code":"orange_juice","name":"Orange Juice","category":"A little refreshment","price":17500,"image":"marinara-menu-Orange Juice.jpg","description":"Bright, citrusy and made for a long lunch.","allergens":[],"recipe":{"orange":0.35,"water":0.05}}],"suppliers":["Davao Pasta & Provisions","Casa Rosso Foods","Italian Pantry Davao","Davao Dairy Supply","Davao Fresh Seafood","Green Basket Produce"]}'::jsonb; as_of date:='2026-09-19'; b uuid; r uuid; sid uuid; iid uuid; mid uuid; oid uuid; pid uuid;
  x jsonb; item jsonb; entry record; g record; po uuid; rec record; line record; day_offset int; ord int; line_index int; ix int; counter int:=0; status text;
  ts timestamptz; qty numeric; price bigint; food bigint; target numeric; supplier_num int; cost numeric;
begin
  if exists(select 1 from cc_private.restaurants where slug='marinara-ristorante') then raise notice 'Marinara V2 already exists; seed skipped without changing data'; return; end if;
  insert into platform.businesses(business_key,display_name,status,timezone,locale,metadata)
    values('command-center-demo-marinara-v2','Marinara Ristorante — Command Center demo','active','Asia/Manila','en-PH','{"is_demo":true,"source":"command-center-v2"}') returning id into b;
  insert into cc_private.restaurants(business_id,slug,name,demo,seed_version,seed_date) values(b,'marinara-ristorante','Marinara Ristorante',true,data->>'version',as_of) returning id into r;
  for ord in 1..8 loop insert into cc_private.stations(restaurant_id,label) values(r,'Table '||ord); end loop;
  for x in select value from jsonb_array_elements(data->'ingredients') loop
    insert into cc_private.ingredients(restaurant_id,code,name,unit,on_hand,average_cost,reorder_at)
      values(r,x->>0,x->>1,x->>2,(x->>4)::numeric,(x->>3)::numeric,(x->>5)::numeric);
  end loop;
  counter:=0;
  for x in select value from jsonb_array_elements(data->'items') loop
    counter:=counter+1;
    insert into cc_private.menu_items(restaurant_id,code,name,category,description,image,price,allergens,sort_order)
      values(r,x->>'code',x->>'name',x->>'category',x->>'description','/marinara/food/'||(x->>'image'),(x->>'price')::bigint,array(select jsonb_array_elements_text(x->'allergens')),counter) returning id into mid;
    for entry in select * from jsonb_each_text(x->'recipe') loop
      insert into cc_private.recipe_lines(restaurant_id,menu_item_id,version,ingredient_id,quantity)
        select r,mid,1,id,entry.value::numeric from cc_private.ingredients where restaurant_id=r and code=entry.key;
    end loop;
  end loop;
  counter:=0;
  for x in select value from jsonb_array_elements(data->'suppliers') loop
    counter:=counter+1;
    insert into cc_private.suppliers(name,contact_email,areas,lead_days,minimum_order,terms,demo)
      values(x#>>'{}','supplier-'||counter||'@example.invalid','Davao City demo delivery area',2,100000,'Fictional supplier. Portal demonstration only; no messages are sent.',true) returning id into sid;
    insert into cc_private.supplier_links values(r,sid,'approved');
    for g in select * from cc_private.ingredients where restaurant_id=r loop
      supplier_num:=case when g.code in ('shrimp','squid','mussels','salmon') then 5 when g.code in ('cream','parmesan','mozzarella','gorgonzola','fontina','burrata','butter','cream_cheese') then 4 when g.code in ('pasta','flour','yeast','salt','sugar','biscuit') then 1 when g.code in ('tomato') then 2 when g.code in ('olive_oil','pecan','cranberry','honey','water') then 3 else 6 end;
      if supplier_num=counter then
        qty:=case when g.code='shrimp' then 5 when g.code='tomato' then 4 else 1 end;
        insert into cc_private.supplier_products(supplier_id,sku,name,category,unit,pack_size,pack_price)
          values(sid,g.code,g.name,'Restaurant supplies',g.unit,qty,round(g.average_cost*qty));
      end if;
    end loop;
  end loop;
  -- Stable weekday/weekend history with price, recipe and cost snapshots.
  for day_offset in reverse 90..0 loop
    for ord in 1..case when day_offset=0 then 26 when extract(isodow from as_of-day_offset) in (6,7) then 24 else 16 end loop
      status:=case when day_offset>0 or ord<=20 then 'COMPLETED' when ord=21 then 'NEW' when ord=22 then 'ACCEPTED' when ord=23 then 'PREPARING' when ord=24 then 'READY' else 'CANCELLED' end;
      ts:=((as_of-day_offset)::text||' 11:00:00+08')::timestamptz + (ord*11)*interval '1 minute';
      insert into cc_private.orders(restaurant_id,station_id,request_key,request_fingerprint,status,origin,created_at,accepted_at,prepared_at,completed_at,cancelled_at,cancellation_reason)
        select r,s.id,md5('marinara-demo-'||day_offset||'-'||ord)::uuid,'{}',status,'seed',ts,
          case when status<>'NEW' and ord<>25 then ts+interval '1 minute' end,
          case when status in ('PREPARING','READY','COMPLETED') or(day_offset=0 and ord=26) then ts+interval '3 minutes' end,
          case when status='COMPLETED' then ts+interval '40 minutes' end,
          case when status='CANCELLED' then ts+interval '5 minutes' end,
          case when status='CANCELLED' then case when ord=25 then 'Guest changed their plans before acceptance' else 'Prepared dish could not be served; recorded as waste' end end
          from cc_private.stations s where s.restaurant_id=r and s.label='Table '||((ord%8)+1) returning id into oid;
      for line_index in 0..1 loop
        ix:=case when line_index=0 then (day_offset*7+ord*3)%9 else 9+(day_offset+ord)%3 end;
        item:=data->'items'->ix;
        select id into mid from cc_private.menu_items where restaurant_id=r and code=item->>'code';
        insert into cc_private.order_items(restaurant_id,order_id,menu_item_id,name,unit_price,quantity,recipe_version)
          values(r,oid,mid,item->>'name',(item->>'price')::bigint,case when ord%5=0 then 2 else 1 end,case when status<>'NEW' and ord<>25 then 1 end);
      end loop;
      if status<>'NEW' and not(day_offset=0 and ord=25) then
        insert into cc_private.order_usage(restaurant_id,order_id,ingredient_id,quantity,unit_cost)
          select r,oid,l.ingredient_id,sum(l.quantity*i.quantity),ingredient.average_cost from cc_private.order_items i
          join cc_private.recipe_lines l on l.menu_item_id=i.menu_item_id and l.version=1 join cc_private.ingredients ingredient on ingredient.id=l.ingredient_id
          where i.order_id=oid group by l.ingredient_id,ingredient.average_cost;
      end if;
      update cc_private.orders set total=(select sum(unit_price*quantity) from cc_private.order_items where order_id=oid),
        food_cost=case when prepared_at is not null then coalesce((select round(sum(quantity*unit_cost)) from cc_private.order_usage where order_id=oid),0) else 0 end where id=oid;
      if status='ACCEPTED' then
        update cc_private.ingredients ingredient set reserved=u.quantity from cc_private.order_usage u where u.order_id=oid and ingredient.id=u.ingredient_id;
      end if;
      if exists(select 1 from cc_private.orders where id=oid and prepared_at is not null) then
        insert into cc_private.stock_movements(restaurant_id,ingredient_id,kind,quantity,unit_cost,reference,reason,created_at)
          select r,ingredient_id,'usage',-quantity,unit_cost,oid::text,'Seeded preparation',ts+interval '3 minutes' from cc_private.order_usage where order_id=oid;
      end if;
      if day_offset=0 and ord=26 then
        insert into cc_private.stock_movements(restaurant_id,ingredient_id,kind,quantity,unit_cost,reference,reason,created_at)
          select r,ingredient_id,'cancelled_prepared',0,unit_cost,oid::text,'Seeded prepared cancellation; consumption retained',ts+interval '5 minutes' from cc_private.order_usage where order_id=oid;
      end if;
    end loop;
  end loop;
  -- Weekly bulk-delivery history reconciles every ingredient's consumption. It is separate from today's incoming purchases.
  for g in select * from cc_private.ingredients where restaurant_id=r loop
    insert into cc_private.stock_movements(restaurant_id,ingredient_id,kind,quantity,unit_cost,reference,reason,created_at)
      values(r,g.id,'opening',g.on_hand,g.average_cost,'seed-opening','Seeded opening balance',(as_of-91)::timestamptz);
    select sp.id,sp.supplier_id into pid,sid from cc_private.supplier_products sp join cc_private.supplier_links sl on sl.supplier_id=sp.supplier_id where sl.restaurant_id=r and sp.sku=g.code;
    for rec in select date_trunc('week',created_at at time zone 'Asia/Manila') as week,-sum(quantity) as quantity from cc_private.stock_movements
      where ingredient_id=g.id and kind='usage' group by 1 order by 1 loop
      insert into cc_private.purchases(restaurant_id,supplier_id,product_id,ingredient_id,request_key,packs,pack_size,pack_price,status,received,approved_version,authority_source,supplier_reference,terms,origin,created_at,confirmed_at)
        values(r,sid,pid,g.id,gen_random_uuid(),1,rec.quantity,round(rec.quantity*g.average_cost),'RECEIVED',rec.quantity,1,'owner','DEMO-BULK-'||rec.week::date,
          'Historical demo bulk delivery; one pack equals the agreed delivery quantity','seed',rec.week at time zone 'Asia/Manila',rec.week at time zone 'Asia/Manila') returning id into po;
      insert into cc_private.receipts(restaurant_id,purchase_id,request_key,quantity,reference,created_at) values(r,po,gen_random_uuid(),rec.quantity,'DEMO-BULK',rec.week at time zone 'Asia/Manila');
      insert into cc_private.stock_movements(restaurant_id,ingredient_id,kind,quantity,unit_cost,reference,reason,created_at)
        values(r,g.id,'receiving',rec.quantity,g.average_cost,po::text,'Seeded weekly delivery',rec.week at time zone 'Asia/Manila');
    end loop;
  end loop;
  for ord in 1..3 loop
    select ingredient.id,sp.id,sp.supplier_id,sp.pack_size into iid,pid,sid,qty from cc_private.ingredients ingredient join cc_private.supplier_products sp on sp.sku=ingredient.code
      join cc_private.supplier_links l on l.supplier_id=sp.supplier_id and l.restaurant_id=r
      where ingredient.restaurant_id=r and ingredient.code=case ord when 1 then 'tomato' when 2 then 'basil' else 'shrimp' end;
    insert into cc_private.purchases(restaurant_id,supplier_id,product_id,ingredient_id,request_key,packs,pack_size,pack_price,delivery_fee,status,hard_pack_limit,target_pack_price,auto_pack_limit,approved_version,authority_source,supplier_reference,origin,created_at,confirmed_at)
      values(r,sid,pid,iid,gen_random_uuid(),case when ord=1 then 3 else 2 end,qty,case ord when 1 then 98000 when 2 then 45000 else 325000 end,
        case when ord=3 then 15000 else 0 end,case ord when 1 then 'CONFIRMED' when 2 then 'QUOTE_REQUESTED' else 'QUOTED' end,
        case ord when 1 then 100000 when 2 then 50000 else 310000 end,case when ord=3 then 280000 else 0 end,case when ord=3 then 295000 else 0 end,
        case when ord=1 then 1 end,case when ord=1 then 'owner' end,case when ord=1 then 'DEMO-TOMATO-CONFIRMED' end,'seed',as_of::timestamptz+interval '8 hours',case when ord=1 then as_of::timestamptz+interval '8 hours' end) returning id into po;
    perform cc_private.record(r,case ord when 1 then 'purchase.confirmed' when 2 then 'purchase.quote_requested' else 'supplier.quote_received' end,po,
      case ord when 1 then 'Tomato sauce confirmed: 12 L incoming; not yet on hand' when 2 then 'Basil quotation requested; waiting for the supplier' else 'Shrimp quote exceeds the pack limit. Owner decision required.' end);
  end loop;
  perform cc_private.record(r,'demo.seeded',r,'Marinara V2 demo is ready. Jourvis is sleeping.',jsonb_build_object('version',data->>'version','asOf',as_of));
end $seed$;