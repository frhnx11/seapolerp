-- The loading slip no longer carries a typed serial; the printed slip uses the
-- truck order number (TO-#NNN) as its SL.No instead.
ALTER TABLE "truck_orders" DROP COLUMN "loading_slip_no";
