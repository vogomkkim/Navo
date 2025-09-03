DROP INDEX "idx_components_page_order";--> statement-breakpoint
CREATE INDEX "idx_components_page_order" ON "components" USING btree ("page_id" uuid_ops,"order_index" int4_ops);