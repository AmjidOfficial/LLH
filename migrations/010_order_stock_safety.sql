CREATE OR REPLACE FUNCTION reserve_order_inventory(p_order_id uuid,p_workspace_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE item record; changed integer;
BEGIN
 FOR item IN SELECT product_id,quantity,sku FROM commerce_order_items WHERE order_id=p_order_id AND workspace_id=p_workspace_id LOOP
  UPDATE atelier_products
   SET quantity_on_hand=quantity_on_hand-item.quantity,
       product_status=CASE WHEN quantity_on_hand-item.quantity=0 THEN 'sold' ELSE product_status END,
       stock_status=CASE WHEN quantity_on_hand-item.quantity=0 THEN 'sold' ELSE 'in_stock' END,
       published=CASE WHEN quantity_on_hand-item.quantity=0 THEN false ELSE published END,
       tryon_enabled=CASE WHEN quantity_on_hand-item.quantity=0 THEN false ELSE tryon_enabled END,
       sold_at=CASE WHEN quantity_on_hand-item.quantity=0 THEN NOW() ELSE sold_at END,
       updated_at=NOW()
   WHERE id=item.product_id AND workspace_id=p_workspace_id AND published=true AND product_status NOT IN ('sold','archived') AND quantity_on_hand>=item.quantity;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed=0 THEN RAISE EXCEPTION 'Insufficient stock or unavailable product: %',item.product_id; END IF;
  INSERT INTO atelier_inventory_movements(workspace_id,product_id,sku,quantity_change,reason)
   VALUES(p_workspace_id,item.product_id,COALESCE(item.sku,'UNASSIGNED'),-item.quantity,'order_placed');
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION release_cancelled_order_inventory(p_order_id uuid,p_workspace_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE item record;
BEGIN
 FOR item IN SELECT product_id,quantity,sku FROM commerce_order_items WHERE order_id=p_order_id AND workspace_id=p_workspace_id LOOP
  UPDATE atelier_products
   SET quantity_on_hand=quantity_on_hand+item.quantity,
       product_status=CASE WHEN product_status='sold' THEN 'active' ELSE product_status END,
       stock_status='in_stock',
       published=CASE WHEN product_status='sold' THEN true ELSE published END,
       sold_at=CASE WHEN product_status='sold' THEN NULL ELSE sold_at END,
       updated_at=NOW()
   WHERE id=item.product_id AND workspace_id=p_workspace_id;
  INSERT INTO atelier_inventory_movements(workspace_id,product_id,sku,quantity_change,reason)
   VALUES(p_workspace_id,item.product_id,COALESCE(item.sku,'UNASSIGNED'),item.quantity,'order_cancelled_stock_return');
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION complete_order_sales(p_order_id uuid,p_workspace_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE item record;
BEGIN
 FOR item IN SELECT product_id,quantity FROM commerce_order_items WHERE order_id=p_order_id AND workspace_id=p_workspace_id LOOP
  UPDATE atelier_products SET sold_count=sold_count+item.quantity,updated_at=NOW()
   WHERE id=item.product_id AND workspace_id=p_workspace_id;
 END LOOP;
END $$;