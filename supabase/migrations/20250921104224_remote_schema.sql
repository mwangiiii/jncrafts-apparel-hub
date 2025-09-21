drop extension if exists "pg_net";

create type "public"."user_role" as enum ('admin', 'customer');

create sequence "public"."timezones_id_seq";


  create table "public"."about_media" (
    "id" uuid not null default gen_random_uuid(),
    "media_type" text not null,
    "media_url" text not null,
    "display_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."about_media" enable row level security;


  create table "public"."admin_audit_log" (
    "id" uuid not null default gen_random_uuid(),
    "admin_user_id" uuid not null,
    "action" text not null,
    "table_name" text not null,
    "record_id" uuid,
    "accessed_data" jsonb,
    "ip_address" inet,
    "user_agent" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."admin_audit_log" enable row level security;


  create table "public"."cart_items" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "session_id" text,
    "product_id" uuid,
    "quantity" integer not null default 1,
    "price" numeric not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "color_id" uuid not null,
    "size_id" uuid not null,
    "thumbnail_image_id" uuid
      );


alter table "public"."cart_items" enable row level security;


  create table "public"."categories" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "display_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."categories" enable row level security;


  create table "public"."colors" (
    "id" uuid not null default gen_random_uuid(),
    "name" character varying(50) not null,
    "hex_code" character varying(7),
    "display_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."colors" enable row level security;


  create table "public"."conversations" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "product_id" uuid,
    "subject" text not null,
    "status" text not null default 'active'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."conversations" enable row level security;


  create table "public"."discount_products" (
    "id" uuid not null default gen_random_uuid(),
    "discount_id" uuid not null,
    "product_id" uuid,
    "category" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."discount_products" enable row level security;


  create table "public"."discounts" (
    "id" uuid not null default gen_random_uuid(),
    "code" text not null,
    "name" text not null,
    "description" text,
    "discount_type" text not null,
    "discount_value" numeric(10,2) not null,
    "min_order_amount" numeric(10,2) default 0,
    "max_uses" integer,
    "current_uses" integer default 0,
    "is_active" boolean default true,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "banner_message" text,
    "applies_to" text default 'all'::text,
    "requires_code" boolean default false,
    "usage_limit" integer,
    "used_count" integer default 0
      );


alter table "public"."discounts" enable row level security;


  create table "public"."guest_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "session_id" text not null,
    "created_at" timestamp with time zone not null default now(),
    "last_accessed" timestamp with time zone not null default now(),
    "expires_at" timestamp with time zone not null default (now() + '30 days'::interval),
    "user_agent" text,
    "ip_address" inet
      );


alter table "public"."guest_sessions" enable row level security;


  create table "public"."homepage_featured" (
    "id" uuid not null default gen_random_uuid(),
    "product_id" uuid,
    "display_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."homepage_featured" enable row level security;


  create table "public"."invoice_receipts" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "document_type" text not null,
    "document_number" text not null,
    "generated_at" timestamp with time zone not null default now(),
    "generated_by" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."invoice_receipts" enable row level security;


  create table "public"."messages" (
    "id" uuid not null default gen_random_uuid(),
    "conversation_id" uuid not null,
    "sender_id" uuid not null,
    "sender_type" text not null,
    "content" text not null,
    "message_type" text not null default 'text'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."messages" enable row level security;


  create table "public"."order_items" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "product_name" text not null,
    "product_image" text,
    "price" numeric(10,2) not null,
    "quantity" integer not null,
    "size" text not null,
    "color" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."order_items" enable row level security;


  create table "public"."order_status" (
    "id" uuid not null default gen_random_uuid(),
    "name" character varying(50) not null,
    "display_name" text not null,
    "description" text,
    "display_order" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."order_status" enable row level security;


  create table "public"."orders" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "order_number" text not null,
    "status" text not null default 'pending'::text,
    "total_amount" numeric(10,2) not null,
    "discount_amount" numeric(10,2) default 0,
    "discount_code" text,
    "shipping_address" jsonb not null,
    "customer_info" jsonb not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "delivery_details" jsonb,
    "transaction_code" text,
    "status_id" uuid not null
      );


alter table "public"."orders" enable row level security;


  create table "public"."product_colors" (
    "id" uuid not null default gen_random_uuid(),
    "product_id" uuid not null,
    "color_id" uuid not null,
    "stock_quantity" integer default 0,
    "additional_price" numeric(10,2) default 0.00,
    "is_available" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."product_colors" enable row level security;


  create table "public"."product_images" (
    "id" uuid not null default gen_random_uuid(),
    "product_id" uuid not null,
    "image_url" text not null,
    "alt_text" text,
    "display_order" integer default 0,
    "is_primary" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."product_images" enable row level security;


  create table "public"."product_inventory" (
    "id" uuid not null default gen_random_uuid(),
    "product_id" uuid not null,
    "color_id" uuid,
    "size_id" uuid,
    "stock_quantity" integer not null default 0,
    "reserved_quantity" integer default 0,
    "reorder_level" integer default 5,
    "last_restocked" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."product_inventory" enable row level security;


  create table "public"."product_sizes" (
    "id" uuid not null default gen_random_uuid(),
    "product_id" uuid not null,
    "size_id" uuid not null,
    "stock_quantity" integer default 0,
    "additional_price" numeric(10,2) default 0.00,
    "is_available" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."product_sizes" enable row level security;


  create table "public"."products" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "price" numeric not null,
    "description" text,
    "category" text not null,
    "stock_quantity" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "thumbnail_index" integer default 0,
    "new_arrival_date" timestamp with time zone,
    "show_jacket_size_chart" boolean default false,
    "show_pants_size_chart" boolean default false
      );


alter table "public"."products" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "full_name" text,
    "phone" text,
    "address" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."profiles" enable row level security;


  create table "public"."settings" (
    "id" uuid not null default gen_random_uuid(),
    "key" text not null,
    "value" jsonb not null default '{}'::jsonb,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."settings" enable row level security;


  create table "public"."sizes" (
    "id" uuid not null default gen_random_uuid(),
    "name" character varying(10) not null,
    "category" character varying(20) default 'clothing'::character varying,
    "display_order" integer not null,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."sizes" enable row level security;


  create table "public"."stock_alerts" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "product_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "notified" boolean default false,
    "email_hash" text not null
      );


alter table "public"."stock_alerts" enable row level security;


  create table "public"."timezones" (
    "id" integer not null default nextval('timezones_id_seq'::regclass),
    "name" text not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."timezones" enable row level security;


  create table "public"."user_roles" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "role" user_role not null default 'customer'::user_role,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."user_roles" enable row level security;


  create table "public"."wishlist_items" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "product_id" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."wishlist_items" enable row level security;

alter sequence "public"."timezones_id_seq" owned by "public"."timezones"."id";

CREATE UNIQUE INDEX about_media_pkey ON public.about_media USING btree (id);

CREATE UNIQUE INDEX admin_audit_log_pkey ON public.admin_audit_log USING btree (id);

CREATE UNIQUE INDEX cart_items_pkey ON public.cart_items USING btree (id);

CREATE UNIQUE INDEX categories_name_key ON public.categories USING btree (name);

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);

CREATE UNIQUE INDEX colors_name_key ON public.colors USING btree (name);

CREATE UNIQUE INDEX colors_pkey ON public.colors USING btree (id);

CREATE UNIQUE INDEX conversations_pkey ON public.conversations USING btree (id);

CREATE UNIQUE INDEX discount_products_pkey ON public.discount_products USING btree (id);

CREATE UNIQUE INDEX discounts_code_key ON public.discounts USING btree (code);

CREATE UNIQUE INDEX discounts_pkey ON public.discounts USING btree (id);

CREATE UNIQUE INDEX guest_sessions_pkey ON public.guest_sessions USING btree (id);

CREATE UNIQUE INDEX guest_sessions_session_id_key ON public.guest_sessions USING btree (session_id);

CREATE UNIQUE INDEX homepage_featured_pkey ON public.homepage_featured USING btree (id);

CREATE INDEX idx_admin_audit_log_profile_access ON public.admin_audit_log USING btree (admin_user_id, created_at) WHERE (table_name = 'profiles'::text);

CREATE INDEX idx_cart_items_color_id ON public.cart_items USING btree (color_id);

CREATE INDEX idx_cart_items_created_at ON public.cart_items USING btree (created_at DESC);

CREATE INDEX idx_cart_items_product_color_size ON public.cart_items USING btree (product_id, color_id, size_id);

CREATE INDEX idx_cart_items_session_created ON public.cart_items USING btree (session_id, created_at DESC);

CREATE INDEX idx_cart_items_session_id ON public.cart_items USING btree (session_id);

CREATE INDEX idx_cart_items_size_id ON public.cart_items USING btree (size_id);

CREATE INDEX idx_cart_items_thumbnail_image ON public.cart_items USING btree (thumbnail_image_id);

CREATE INDEX idx_cart_items_user_created_at ON public.cart_items USING btree (user_id, created_at DESC);

CREATE INDEX idx_cart_items_user_created_desc ON public.cart_items USING btree (user_id, created_at DESC) WHERE (user_id IS NOT NULL);

CREATE INDEX idx_cart_items_user_id ON public.cart_items USING btree (user_id);

CREATE INDEX idx_cart_items_user_session ON public.cart_items USING btree (user_id, session_id, created_at DESC);

CREATE INDEX idx_colors_active_display_order ON public.colors USING btree (id, display_order) WHERE (is_active = true);

CREATE INDEX idx_colors_display_order ON public.colors USING btree (display_order) WHERE (is_active = true);

CREATE INDEX idx_colors_id_active ON public.colors USING btree (id) WHERE (is_active = true);

CREATE INDEX idx_colors_id_name ON public.colors USING btree (id, name, hex_code);

CREATE INDEX idx_conversations_product_id ON public.conversations USING btree (product_id);

CREATE INDEX idx_conversations_status ON public.conversations USING btree (status);

CREATE INDEX idx_conversations_updated_at ON public.conversations USING btree (updated_at DESC);

CREATE INDEX idx_conversations_user_id ON public.conversations USING btree (user_id);

CREATE INDEX idx_conversations_user_updated ON public.conversations USING btree (user_id, updated_at DESC);

CREATE INDEX idx_discount_products_discount_id ON public.discount_products USING btree (discount_id);

CREATE INDEX idx_discount_products_product_id ON public.discount_products USING btree (product_id);

CREATE INDEX idx_guest_sessions_expires_at ON public.guest_sessions USING btree (expires_at);

CREATE INDEX idx_guest_sessions_session_id ON public.guest_sessions USING btree (session_id);

CREATE INDEX idx_homepage_featured_active_order ON public.homepage_featured USING btree (is_active, display_order) WHERE (is_active = true);

CREATE INDEX idx_inventory_combo ON public.product_inventory USING btree (product_id, color_id, size_id);

CREATE INDEX idx_inventory_low_stock ON public.product_inventory USING btree (product_id) WHERE (stock_quantity <= reorder_level);

CREATE INDEX idx_inventory_product ON public.product_inventory USING btree (product_id);

CREATE INDEX idx_invoice_receipts_document_type ON public.invoice_receipts USING btree (document_type);

CREATE INDEX idx_invoice_receipts_order_id ON public.invoice_receipts USING btree (order_id);

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at);

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);

CREATE INDEX idx_orders_status_id ON public.orders USING btree (status_id);

CREATE INDEX idx_orders_transaction_code ON public.orders USING btree (transaction_code);

CREATE INDEX idx_orders_user_created ON public.orders USING btree (user_id, created_at DESC);

CREATE INDEX idx_product_colors_available ON public.product_colors USING btree (product_id, is_available) WHERE (is_available = true);

CREATE INDEX idx_product_colors_color_id ON public.product_colors USING btree (color_id);

CREATE INDEX idx_product_colors_product_id ON public.product_colors USING btree (product_id);

CREATE INDEX idx_product_colors_product_id_active ON public.product_colors USING btree (product_id) WHERE (is_available = true);

CREATE INDEX idx_product_images_display_order ON public.product_images USING btree (display_order);

CREATE INDEX idx_product_images_optimized ON public.product_images USING btree (product_id, is_primary DESC, display_order) WHERE ((is_primary = true) OR (display_order = 1));

CREATE INDEX idx_product_images_primary ON public.product_images USING btree (product_id, is_primary DESC, display_order) WHERE (is_primary = true);

CREATE INDEX idx_product_images_primary_lookup ON public.product_images USING btree (product_id, is_primary DESC, display_order, created_at) WHERE (is_primary = true);

CREATE INDEX idx_product_images_product_display_order ON public.product_images USING btree (product_id, display_order);

CREATE INDEX idx_product_images_product_id ON public.product_images USING btree (product_id);

CREATE INDEX idx_product_images_product_id_display_order ON public.product_images USING btree (product_id, display_order, created_at);

CREATE INDEX idx_product_images_product_primary ON public.product_images USING btree (product_id, is_primary DESC, display_order);

CREATE INDEX idx_product_images_thumbnail ON public.product_images USING btree (product_id, display_order) WHERE ((display_order = 1) AND (image_url IS NOT NULL));

CREATE INDEX idx_product_images_thumbnail_fast ON public.product_images USING btree (product_id, display_order, is_primary);

CREATE INDEX idx_product_inventory_color_id ON public.product_inventory USING btree (color_id);

CREATE INDEX idx_product_inventory_size_id ON public.product_inventory USING btree (size_id);

CREATE INDEX idx_product_sizes_available ON public.product_sizes USING btree (product_id, is_available) WHERE (is_available = true);

CREATE INDEX idx_product_sizes_product_id ON public.product_sizes USING btree (product_id);

CREATE INDEX idx_product_sizes_product_id_active ON public.product_sizes USING btree (product_id) WHERE (is_available = true);

CREATE INDEX idx_product_sizes_size_id ON public.product_sizes USING btree (size_id);

CREATE INDEX idx_products_active_category ON public.products USING btree (is_active, category) WHERE (is_active = true);

CREATE INDEX idx_products_active_category_created ON public.products USING btree (is_active, category, created_at DESC, id DESC) WHERE (is_active = true);

CREATE INDEX idx_products_active_created ON public.products USING btree (is_active, created_at DESC, category) WHERE (is_active = true);

CREATE INDEX idx_products_active_created_id ON public.products USING btree (is_active, created_at DESC, id DESC) WHERE (is_active = true);

CREATE INDEX idx_products_active_name ON public.products USING btree (is_active, name) WHERE (is_active = true);

CREATE INDEX idx_products_active_new_arrival ON public.products USING btree (is_active, new_arrival_date DESC) WHERE ((is_active = true) AND (new_arrival_date IS NOT NULL));

CREATE INDEX idx_products_active_stock ON public.products USING btree (is_active, stock_quantity) WHERE (is_active = true);

CREATE INDEX idx_products_admin_list ON public.products USING btree (created_at DESC, id DESC) WHERE (is_active = true);

CREATE INDEX idx_products_category ON public.products USING btree (category);

CREATE INDEX idx_products_category_active ON public.products USING btree (category, is_active) WHERE (is_active = true);

CREATE INDEX idx_products_category_active_created ON public.products USING btree (category, is_active, created_at DESC) WHERE (is_active = true);

CREATE INDEX idx_products_category_created_id ON public.products USING btree (category, is_active, created_at DESC, id DESC);

CREATE INDEX idx_products_created_at ON public.products USING btree (created_at DESC);

CREATE INDEX idx_products_created_id ON public.products USING btree (created_at DESC, id);

CREATE INDEX idx_products_id ON public.products USING btree (id);

CREATE INDEX idx_products_id_active ON public.products USING btree (id) WHERE (is_active = true);

CREATE INDEX idx_products_isactive_name ON public.products USING btree (is_active, name);

CREATE INDEX idx_products_name_search ON public.products USING gin (to_tsvector('english'::regconfig, name));

CREATE INDEX idx_products_new_arrival ON public.products USING btree (new_arrival_date DESC) WHERE ((new_arrival_date IS NOT NULL) AND (is_active = true));

CREATE INDEX idx_products_performance_covering ON public.products USING btree (is_active, category, created_at DESC, id, name, price, stock_quantity, new_arrival_date) WHERE (is_active = true);

CREATE INDEX idx_products_updated_at ON public.products USING btree (updated_at DESC);

CREATE INDEX idx_sizes_active_display_order ON public.sizes USING btree (id, display_order) WHERE (is_active = true);

CREATE INDEX idx_sizes_display_order ON public.sizes USING btree (display_order) WHERE (is_active = true);

CREATE INDEX idx_sizes_id_active ON public.sizes USING btree (id) WHERE (is_active = true);

CREATE INDEX idx_sizes_id_name_category ON public.sizes USING btree (id, name, category);

CREATE INDEX idx_stock_alerts_email_hash ON public.stock_alerts USING btree (email_hash);

CREATE INDEX idx_stock_alerts_unnotified ON public.stock_alerts USING btree (product_id, user_id) WHERE (notified = false);

CREATE INDEX idx_timezones_name ON public.timezones USING btree (name);

CREATE INDEX idx_wishlist_user_created ON public.wishlist_items USING btree (user_id, created_at DESC);

CREATE UNIQUE INDEX invoice_receipts_document_number_key ON public.invoice_receipts USING btree (document_number);

CREATE UNIQUE INDEX invoice_receipts_pkey ON public.invoice_receipts USING btree (id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id);

CREATE UNIQUE INDEX order_status_name_key ON public.order_status USING btree (name);

CREATE UNIQUE INDEX order_status_pkey ON public.order_status USING btree (id);

CREATE UNIQUE INDEX orders_order_number_key ON public.orders USING btree (order_number);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE UNIQUE INDEX product_colors_pkey ON public.product_colors USING btree (id);

CREATE UNIQUE INDEX product_colors_product_id_color_id_key ON public.product_colors USING btree (product_id, color_id);

CREATE UNIQUE INDEX product_images_pkey ON public.product_images USING btree (id);

CREATE UNIQUE INDEX product_inventory_pkey ON public.product_inventory USING btree (id);

CREATE UNIQUE INDEX product_inventory_product_id_color_id_size_id_key ON public.product_inventory USING btree (product_id, color_id, size_id);

CREATE UNIQUE INDEX product_sizes_pkey ON public.product_sizes USING btree (id);

CREATE UNIQUE INDEX product_sizes_product_id_size_id_key ON public.product_sizes USING btree (product_id, size_id);

CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id);

CREATE UNIQUE INDEX settings_key_key ON public.settings USING btree (key);

CREATE UNIQUE INDEX settings_pkey ON public.settings USING btree (id);

CREATE UNIQUE INDEX sizes_name_key ON public.sizes USING btree (name);

CREATE UNIQUE INDEX sizes_pkey ON public.sizes USING btree (id);

CREATE UNIQUE INDEX stock_alerts_pkey ON public.stock_alerts USING btree (id);

CREATE UNIQUE INDEX timezones_name_key ON public.timezones USING btree (name);

CREATE UNIQUE INDEX timezones_pkey ON public.timezones USING btree (id);

CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id);

CREATE UNIQUE INDEX user_roles_user_id_role_key ON public.user_roles USING btree (user_id, role);

CREATE UNIQUE INDEX wishlist_items_pkey ON public.wishlist_items USING btree (id);

alter table "public"."about_media" add constraint "about_media_pkey" PRIMARY KEY using index "about_media_pkey";

alter table "public"."admin_audit_log" add constraint "admin_audit_log_pkey" PRIMARY KEY using index "admin_audit_log_pkey";

alter table "public"."cart_items" add constraint "cart_items_pkey" PRIMARY KEY using index "cart_items_pkey";

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."colors" add constraint "colors_pkey" PRIMARY KEY using index "colors_pkey";

alter table "public"."conversations" add constraint "conversations_pkey" PRIMARY KEY using index "conversations_pkey";

alter table "public"."discount_products" add constraint "discount_products_pkey" PRIMARY KEY using index "discount_products_pkey";

alter table "public"."discounts" add constraint "discounts_pkey" PRIMARY KEY using index "discounts_pkey";

alter table "public"."guest_sessions" add constraint "guest_sessions_pkey" PRIMARY KEY using index "guest_sessions_pkey";

alter table "public"."homepage_featured" add constraint "homepage_featured_pkey" PRIMARY KEY using index "homepage_featured_pkey";

alter table "public"."invoice_receipts" add constraint "invoice_receipts_pkey" PRIMARY KEY using index "invoice_receipts_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."order_items" add constraint "order_items_pkey" PRIMARY KEY using index "order_items_pkey";

alter table "public"."order_status" add constraint "order_status_pkey" PRIMARY KEY using index "order_status_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."product_colors" add constraint "product_colors_pkey" PRIMARY KEY using index "product_colors_pkey";

alter table "public"."product_images" add constraint "product_images_pkey" PRIMARY KEY using index "product_images_pkey";

alter table "public"."product_inventory" add constraint "product_inventory_pkey" PRIMARY KEY using index "product_inventory_pkey";

alter table "public"."product_sizes" add constraint "product_sizes_pkey" PRIMARY KEY using index "product_sizes_pkey";

alter table "public"."products" add constraint "products_pkey" PRIMARY KEY using index "products_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."settings" add constraint "settings_pkey" PRIMARY KEY using index "settings_pkey";

alter table "public"."sizes" add constraint "sizes_pkey" PRIMARY KEY using index "sizes_pkey";

alter table "public"."stock_alerts" add constraint "stock_alerts_pkey" PRIMARY KEY using index "stock_alerts_pkey";

alter table "public"."timezones" add constraint "timezones_pkey" PRIMARY KEY using index "timezones_pkey";

alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

alter table "public"."wishlist_items" add constraint "wishlist_items_pkey" PRIMARY KEY using index "wishlist_items_pkey";

alter table "public"."about_media" add constraint "about_media_media_type_check" CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text]))) not valid;

alter table "public"."about_media" validate constraint "about_media_media_type_check";

alter table "public"."cart_items" add constraint "cart_items_color_id_fkey" FOREIGN KEY (color_id) REFERENCES colors(id) not valid;

alter table "public"."cart_items" validate constraint "cart_items_color_id_fkey";

alter table "public"."cart_items" add constraint "cart_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE not valid;

alter table "public"."cart_items" validate constraint "cart_items_product_id_fkey";

alter table "public"."cart_items" add constraint "cart_items_size_id_fkey" FOREIGN KEY (size_id) REFERENCES sizes(id) not valid;

alter table "public"."cart_items" validate constraint "cart_items_size_id_fkey";

alter table "public"."cart_items" add constraint "cart_items_thumbnail_image_id_fkey" FOREIGN KEY (thumbnail_image_id) REFERENCES product_images(id) ON DELETE SET NULL not valid;

alter table "public"."cart_items" validate constraint "cart_items_thumbnail_image_id_fkey";

alter table "public"."cart_items" add constraint "cart_user_or_session" CHECK (((user_id IS NOT NULL) OR (session_id IS NOT NULL))) not valid;

alter table "public"."cart_items" validate constraint "cart_user_or_session";

alter table "public"."categories" add constraint "categories_name_key" UNIQUE using index "categories_name_key";

alter table "public"."colors" add constraint "colors_name_key" UNIQUE using index "colors_name_key";

alter table "public"."conversations" add constraint "conversations_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL not valid;

alter table "public"."conversations" validate constraint "conversations_product_id_fkey";

alter table "public"."conversations" add constraint "conversations_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'closed'::text, 'pending'::text]))) not valid;

alter table "public"."conversations" validate constraint "conversations_status_check";

alter table "public"."conversations" add constraint "conversations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."conversations" validate constraint "conversations_user_id_fkey";

alter table "public"."discount_products" add constraint "discount_products_check" CHECK ((((product_id IS NOT NULL) AND (category IS NULL)) OR ((product_id IS NULL) AND (category IS NOT NULL)))) not valid;

alter table "public"."discount_products" validate constraint "discount_products_check";

alter table "public"."discount_products" add constraint "discount_products_discount_id_fkey" FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE CASCADE not valid;

alter table "public"."discount_products" validate constraint "discount_products_discount_id_fkey";

alter table "public"."discount_products" add constraint "discount_products_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE not valid;

alter table "public"."discount_products" validate constraint "discount_products_product_id_fkey";

alter table "public"."discounts" add constraint "discounts_applies_to_check" CHECK ((applies_to = ANY (ARRAY['all'::text, 'specific'::text, 'category'::text]))) not valid;

alter table "public"."discounts" validate constraint "discounts_applies_to_check";

alter table "public"."discounts" add constraint "discounts_code_key" UNIQUE using index "discounts_code_key";

alter table "public"."discounts" add constraint "discounts_discount_type_check" CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text]))) not valid;

alter table "public"."discounts" validate constraint "discounts_discount_type_check";

alter table "public"."guest_sessions" add constraint "guest_sessions_session_id_key" UNIQUE using index "guest_sessions_session_id_key";

alter table "public"."homepage_featured" add constraint "homepage_featured_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE not valid;

alter table "public"."homepage_featured" validate constraint "homepage_featured_product_id_fkey";

alter table "public"."invoice_receipts" add constraint "invoice_receipts_document_number_key" UNIQUE using index "invoice_receipts_document_number_key";

alter table "public"."invoice_receipts" add constraint "invoice_receipts_document_type_check" CHECK ((document_type = ANY (ARRAY['invoice'::text, 'receipt'::text]))) not valid;

alter table "public"."invoice_receipts" validate constraint "invoice_receipts_document_type_check";

alter table "public"."messages" add constraint "messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_conversation_id_fkey";

alter table "public"."messages" add constraint "messages_message_type_check" CHECK ((message_type = ANY (ARRAY['text'::text, 'system'::text]))) not valid;

alter table "public"."messages" validate constraint "messages_message_type_check";

alter table "public"."messages" add constraint "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_sender_id_fkey";

alter table "public"."messages" add constraint "messages_sender_type_check" CHECK ((sender_type = ANY (ARRAY['user'::text, 'admin'::text]))) not valid;

alter table "public"."messages" validate constraint "messages_sender_type_check";

alter table "public"."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_order_id_fkey";

alter table "public"."order_status" add constraint "order_status_name_key" UNIQUE using index "order_status_name_key";

alter table "public"."orders" add constraint "fk_orders_status_id" FOREIGN KEY (status_id) REFERENCES order_status(id) not valid;

alter table "public"."orders" validate constraint "fk_orders_status_id";

alter table "public"."orders" add constraint "orders_order_number_key" UNIQUE using index "orders_order_number_key";

alter table "public"."orders" add constraint "orders_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text]))) not valid;

alter table "public"."orders" validate constraint "orders_status_check";

alter table "public"."orders" add constraint "orders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_user_id_fkey";

alter table "public"."product_colors" add constraint "product_colors_color_id_fkey" FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE CASCADE not valid;

alter table "public"."product_colors" validate constraint "product_colors_color_id_fkey";

alter table "public"."product_colors" add constraint "product_colors_product_id_color_id_key" UNIQUE using index "product_colors_product_id_color_id_key";

alter table "public"."product_colors" add constraint "product_colors_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE not valid;

alter table "public"."product_colors" validate constraint "product_colors_product_id_fkey";

alter table "public"."product_images" add constraint "product_images_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE not valid;

alter table "public"."product_images" validate constraint "product_images_product_id_fkey";

alter table "public"."product_inventory" add constraint "product_inventory_color_id_fkey" FOREIGN KEY (color_id) REFERENCES colors(id) not valid;

alter table "public"."product_inventory" validate constraint "product_inventory_color_id_fkey";

alter table "public"."product_inventory" add constraint "product_inventory_product_id_color_id_size_id_key" UNIQUE using index "product_inventory_product_id_color_id_size_id_key";

alter table "public"."product_inventory" add constraint "product_inventory_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE not valid;

alter table "public"."product_inventory" validate constraint "product_inventory_product_id_fkey";

alter table "public"."product_inventory" add constraint "product_inventory_size_id_fkey" FOREIGN KEY (size_id) REFERENCES sizes(id) not valid;

alter table "public"."product_inventory" validate constraint "product_inventory_size_id_fkey";

alter table "public"."product_sizes" add constraint "product_sizes_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE not valid;

alter table "public"."product_sizes" validate constraint "product_sizes_product_id_fkey";

alter table "public"."product_sizes" add constraint "product_sizes_product_id_size_id_key" UNIQUE using index "product_sizes_product_id_size_id_key";

alter table "public"."product_sizes" add constraint "product_sizes_size_id_fkey" FOREIGN KEY (size_id) REFERENCES sizes(id) ON DELETE CASCADE not valid;

alter table "public"."product_sizes" validate constraint "product_sizes_size_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_key" UNIQUE using index "profiles_user_id_key";

alter table "public"."settings" add constraint "settings_key_key" UNIQUE using index "settings_key_key";

alter table "public"."sizes" add constraint "sizes_name_key" UNIQUE using index "sizes_name_key";

alter table "public"."stock_alerts" add constraint "email_hash_format_check" CHECK (((length(email_hash) = 64) AND (email_hash ~ '^[a-f0-9]+$'::text))) not valid;

alter table "public"."stock_alerts" validate constraint "email_hash_format_check";

alter table "public"."timezones" add constraint "timezones_name_key" UNIQUE using index "timezones_name_key";

alter table "public"."user_roles" add constraint "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_user_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_role_key" UNIQUE using index "user_roles_user_id_role_key";

alter table "public"."wishlist_items" add constraint "wishlist_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE not valid;

alter table "public"."wishlist_items" validate constraint "wishlist_items_product_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.add_to_cart_normalized(p_product_id uuid, p_color_name text, p_size_name text, p_quantity integer, p_price numeric, p_user_id uuid DEFAULT NULL::uuid, p_session_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_color_id uuid;
    v_size_id uuid;
    v_cart_item_id uuid;
    v_existing_item_id uuid;
BEGIN
    -- Validate inputs
    IF p_product_id IS NULL OR p_quantity <= 0 OR p_price <= 0 THEN
        RAISE EXCEPTION 'Invalid input parameters';
    END IF;
    
    IF (p_user_id IS NULL AND p_session_id IS NULL) OR (p_user_id IS NOT NULL AND p_session_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Must provide either user_id or session_id, but not both';
    END IF;
    
    -- Get color_id by name (case insensitive)
    SELECT id INTO v_color_id 
    FROM colors 
    WHERE LOWER(name) = LOWER(p_color_name) AND is_active = true
    LIMIT 1;
    
    -- If color not found, use "Unknown" 
    IF v_color_id IS NULL THEN
        SELECT id INTO v_color_id FROM colors WHERE name = 'Unknown' LIMIT 1;
    END IF;
    
    -- Get size_id by name (case insensitive)
    SELECT id INTO v_size_id
    FROM sizes
    WHERE LOWER(name) = LOWER(p_size_name) AND is_active = true  
    LIMIT 1;
    
    -- If size not found, use "Unknown"
    IF v_size_id IS NULL THEN
        SELECT id INTO v_size_id FROM sizes WHERE name = 'Unknown' LIMIT 1;
    END IF;
    
    -- Check if item already exists in cart
    SELECT id INTO v_existing_item_id
    FROM cart_items
    WHERE product_id = p_product_id
      AND color_id = v_color_id
      AND size_id = v_size_id
      AND (
          (p_user_id IS NOT NULL AND user_id = p_user_id) OR
          (p_session_id IS NOT NULL AND session_id = p_session_id)
      );
    
    -- If exists, update quantity
    IF v_existing_item_id IS NOT NULL THEN
        UPDATE cart_items 
        SET quantity = quantity + p_quantity,
            updated_at = now()
        WHERE id = v_existing_item_id;
        
        RETURN v_existing_item_id;
    END IF;
    
    -- Insert new cart item
    INSERT INTO cart_items (
        user_id, session_id, product_id, color_id, size_id, quantity, price
    ) VALUES (
        p_user_id, p_session_id, p_product_id, v_color_id, v_size_id, p_quantity, p_price
    ) RETURNING id INTO v_cart_item_id;
    
    RETURN v_cart_item_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_stock_alerts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If stock quantity changed from 0 to positive, trigger alerts
  IF OLD.stock_quantity = 0 AND NEW.stock_quantity > 0 THEN
    -- Mark alerts as needing notification (will be handled by edge function)
    UPDATE public.stock_alerts 
    SET notified = FALSE 
    WHERE product_id = NEW.id AND notified = TRUE;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete expired sessions and associated cart items
  DELETE FROM public.cart_items 
  WHERE session_id IN (
    SELECT session_id 
    FROM public.guest_sessions 
    WHERE expires_at < now()
  );
  
  DELETE FROM public.guest_sessions 
  WHERE expires_at < now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_stock_alert_secure(p_product_id uuid, p_email text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  alert_id uuid;
  hashed_email text;
BEGIN
  -- Validate inputs
  IF p_product_id IS NULL OR p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Product ID and email are required';
  END IF;
  
  -- Validate email format
  IF p_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Hash the email using existing function
  hashed_email := public.hash_email(p_email);
  
  -- Check if alert already exists for this product and email hash
  SELECT id INTO alert_id
  FROM public.stock_alerts 
  WHERE product_id = p_product_id 
    AND email_hash = hashed_email
    AND user_id = auth.uid();
  
  -- If alert exists, return existing ID
  IF alert_id IS NOT NULL THEN
    RETURN alert_id;
  END IF;
  
  -- Create new stock alert with hashed email only
  INSERT INTO public.stock_alerts (user_id, product_id, email_hash)
  VALUES (auth.uid(), p_product_id, hashed_email)
  RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  order_num TEXT;
BEGIN
  order_num := 'JNC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT, 10, '0');
  RETURN order_num;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_admin_products_ultra_fast(p_limit integer DEFAULT 8, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, price numeric, category text, description text, stock_quantity integer, is_active boolean, new_arrival_date timestamp with time zone, thumbnail_index integer, created_at timestamp with time zone, updated_at timestamp with time zone, thumbnail_image text, total_images integer, has_colors boolean, has_sizes boolean, colors_count integer, sizes_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT 
        map.id,
        map.name,
        map.price,
        map.category,
        map.description,
        map.stock_quantity,
        map.is_active,
        map.new_arrival_date,
        map.thumbnail_index,
        map.created_at,
        map.updated_at,
        map.thumbnail_image,
        map.total_images::integer,
        map.has_colors,
        map.has_sizes,
        map.colors_count::integer,
        map.sizes_count::integer
    FROM public.mv_admin_products map
    ORDER BY map.created_at DESC, map.id DESC
    LIMIT p_limit
    OFFSET p_offset;
$function$
;

CREATE OR REPLACE FUNCTION public.get_categories_fast()
 RETURNS TABLE(category text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT p.category
  FROM public.products p
  WHERE p.is_active = true
  ORDER BY p.category;
$function$
;

CREATE OR REPLACE FUNCTION public.get_featured_products_ultra_fast(p_limit integer DEFAULT 6)
 RETURNS TABLE(id uuid, display_order integer, product_id uuid, name text, price numeric, category text, thumbnail_image text, stock_quantity integer, new_arrival_date timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET enable_seqscan TO 'off'
 SET statement_timeout TO '1s'
AS $function$
    SELECT 
        hf.id,
        hf.display_order,
        hf.product_id,
        pl.name,
        pl.price,
        pl.category,
        pl.thumbnail_image,
        pl.stock_quantity,
        pl.new_arrival_date
    FROM public.homepage_featured hf
    JOIN public.mv_products_landing pl ON pl.id = hf.product_id
    WHERE hf.is_active = true
      AND pl.is_active = true
    ORDER BY hf.display_order ASC
    LIMIT LEAST(p_limit, 8);
$function$
;

CREATE OR REPLACE FUNCTION public.get_product_complete(p_product_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    result_json json;
    product_exists boolean;
BEGIN
    -- First check if product exists and is active
    SELECT EXISTS (
        SELECT 1 FROM products 
        WHERE id = p_product_id AND is_active = true
    ) INTO product_exists;
    
    IF NOT product_exists THEN
        RETURN NULL;
    END IF;
    
    -- Build the result with simpler queries to avoid timeouts
    SELECT json_build_object(
        'id', p.id,
        'name', p.name,
        'price', p.price,
        'description', p.description,
        'category', p.category,
        'stock_quantity', p.stock_quantity,
        'is_active', p.is_active,
        'new_arrival_date', p.new_arrival_date,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'thumbnail_index', p.thumbnail_index,
        'images', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'id', pi.id,
                    'url', pi.image_url,
                    'alt', pi.alt_text,
                    'is_primary', pi.is_primary,
                    'order', pi.display_order
                ) ORDER BY pi.display_order NULLS LAST, pi.created_at
            )
            FROM product_images pi
            WHERE pi.product_id = p.id
        ), '[]'::json),
        'colors', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'id', c.id,
                    'name', c.name,
                    'hex', c.hex_code,
                    'stock', pc.stock_quantity,
                    'available', pc.is_available
                ) ORDER BY c.display_order NULLS LAST
            )
            FROM product_colors pc
            INNER JOIN colors c ON pc.color_id = c.id 
            WHERE pc.product_id = p.id 
              AND c.is_active = true 
              AND pc.is_available = true
        ), '[]'::json),
        'sizes', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'id', s.id,
                    'name', s.name,
                    'category', s.category,
                    'stock', ps.stock_quantity,
                    'available', ps.is_available
                ) ORDER BY s.display_order NULLS LAST
            )
            FROM product_sizes ps
            INNER JOIN sizes s ON ps.size_id = s.id 
            WHERE ps.product_id = p.id 
              AND s.is_active = true 
              AND ps.is_available = true
        ), '[]'::json)
    ) INTO result_json
    FROM products p
    WHERE p.id = p_product_id AND p.is_active = true;
    
    RETURN result_json;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_products_by_category_fast(p_category text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, price numeric, category text, thumbnail_image text, stock_quantity integer, new_arrival_date timestamp with time zone, created_at timestamp with time zone, has_colors boolean, has_sizes boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET enable_seqscan TO 'off'
 SET work_mem TO '64MB'
 SET statement_timeout TO '2s'
AS $function$
    SELECT 
        pl.id,
        pl.name,
        pl.price,
        pl.category,
        pl.thumbnail_image,
        pl.stock_quantity,
        pl.new_arrival_date,
        pl.created_at,
        pl.has_colors,
        pl.has_sizes
    FROM public.mv_products_landing pl
    WHERE pl.is_active = true
      AND pl.category = p_category
    ORDER BY pl.created_at DESC
    LIMIT LEAST(p_limit, 20)
    OFFSET GREATEST(0, p_offset);
$function$
;

CREATE OR REPLACE FUNCTION public.get_products_direct_fast(p_category text DEFAULT 'all'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, price numeric, category text, thumbnail_image text, stock_quantity integer, new_arrival_date timestamp with time zone, created_at timestamp with time zone, has_colors boolean, has_sizes boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET enable_seqscan TO 'off'
 SET work_mem TO '128MB'
 SET statement_timeout TO '3s'
AS $function$
    SELECT 
        p.id,
        p.name,
        p.price,
        p.category,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND display_order = 1 LIMIT 1) as thumbnail_image,
        p.stock_quantity,
        p.new_arrival_date,
        p.created_at,
        false as has_colors,
        false as has_sizes
    FROM products p
    WHERE p.is_active = true
      AND (p_category = 'all' OR p.category = p_category)
    ORDER BY p.created_at DESC
    LIMIT LEAST(p_limit, 30)  -- Even smaller limit for direct query
    OFFSET GREATEST(0, p_offset);
$function$
;

CREATE OR REPLACE FUNCTION public.get_products_lightweight_v2(p_category text DEFAULT 'all'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, price numeric, category text, thumbnail_image text, stock_quantity integer, new_arrival_date timestamp with time zone, created_at timestamp with time zone, has_colors boolean, has_sizes boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT 
        p.id,
        p.name,
        p.price,
        p.category,
        (SELECT pi.image_url 
         FROM product_images pi 
         WHERE pi.product_id = p.id 
         ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.created_at ASC 
         LIMIT 1) as thumbnail_image,
        p.stock_quantity,
        p.new_arrival_date,
        p.created_at,
        EXISTS(SELECT 1 FROM product_colors WHERE product_id = p.id) as has_colors,
        EXISTS(SELECT 1 FROM product_sizes WHERE product_id = p.id) as has_sizes
    FROM products p
    WHERE p.is_active = true
      AND (p_category = 'all' OR p.category = p_category)
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT p_limit
    OFFSET p_offset;
$function$
;

CREATE OR REPLACE FUNCTION public.get_products_minimal(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, price numeric, category text, thumbnail_image text, stock_quantity integer, new_arrival_date timestamp with time zone, created_at timestamp with time zone, has_colors boolean, has_sizes boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET enable_seqscan TO 'off'
 SET work_mem TO '64MB'
 SET statement_timeout TO '2s'
 SET enable_nestloop TO 'off'
AS $function$
    SELECT 
        pl.id,
        pl.name,
        pl.price,
        pl.category,
        pl.thumbnail_image,
        pl.stock_quantity,
        pl.new_arrival_date,
        pl.created_at,
        pl.has_colors,
        pl.has_sizes
    FROM public.mv_products_landing pl
    WHERE pl.is_active = true
    ORDER BY pl.created_at DESC
    LIMIT LEAST(p_limit, 20)
    OFFSET GREATEST(0, p_offset);
$function$
;

CREATE OR REPLACE FUNCTION public.get_products_ultra_fast(p_category text DEFAULT 'all'::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, price numeric, category text, thumbnail_image text, stock_quantity integer, new_arrival_date timestamp with time zone, created_at timestamp with time zone, has_colors boolean, has_sizes boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '5s'
AS $function$
  SELECT * FROM public.get_products_ultra_fast_v2(p_category, p_limit, p_offset);
$function$
;

CREATE OR REPLACE FUNCTION public.get_products_ultra_fast_v2(p_category text DEFAULT 'all'::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, price numeric, category text, thumbnail_image text, stock_quantity integer, new_arrival_date timestamp with time zone, created_at timestamp with time zone, has_colors boolean, has_sizes boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '5s'
AS $function$
  WITH primary_images AS (
    SELECT DISTINCT ON (product_id) 
      product_id,
      image_url
    FROM product_images
    ORDER BY product_id, is_primary DESC, display_order ASC, created_at ASC
  )
  SELECT 
    p.id,
    p.name,
    p.price,
    p.category,
    COALESCE(pi.image_url, '') as thumbnail_image,
    p.stock_quantity,
    p.new_arrival_date,
    p.created_at,
    EXISTS(SELECT 1 FROM product_colors pc WHERE pc.product_id = p.id AND pc.is_available = true) as has_colors,
    EXISTS(SELECT 1 FROM product_sizes ps WHERE ps.product_id = p.id AND ps.is_available = true) as has_sizes
  FROM products p
  LEFT JOIN primary_images pi ON p.id = pi.product_id
  WHERE p.is_active = true
    AND (p_category = 'all' OR p.category = p_category)
  ORDER BY 
    CASE WHEN p_category = 'all' THEN p.category END ASC,
    p.created_at DESC
  LIMIT LEAST(p_limit, 50)
  OFFSET GREATEST(0, p_offset);
$function$
;

CREATE OR REPLACE FUNCTION public.get_valid_status_transitions(current_status_name text)
 RETURNS TABLE(id uuid, name character varying, display_name text, description text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Define valid transitions based on business logic
  IF current_status_name = 'pending' THEN
    RETURN QUERY
    SELECT os.id, os.name, os.display_name, os.description 
    FROM order_status os 
    WHERE os.name IN ('confirmed', 'cancelled') AND os.is_active = true;
  ELSIF current_status_name = 'confirmed' THEN
    RETURN QUERY
    SELECT os.id, os.name, os.display_name, os.description 
    FROM order_status os 
    WHERE os.name IN ('processing', 'cancelled') AND os.is_active = true;
  ELSIF current_status_name = 'processing' THEN
    RETURN QUERY
    SELECT os.id, os.name, os.display_name, os.description 
    FROM order_status os 
    WHERE os.name IN ('packed', 'cancelled') AND os.is_active = true;
  ELSIF current_status_name = 'packed' THEN
    RETURN QUERY
    SELECT os.id, os.name, os.display_name, os.description 
    FROM order_status os 
    WHERE os.name IN ('shipped', 'cancelled') AND os.is_active = true;
  ELSIF current_status_name = 'shipped' THEN
    RETURN QUERY
    SELECT os.id, os.name, os.display_name, os.description 
    FROM order_status os 
    WHERE os.name IN ('out_for_delivery', 'delivered') AND os.is_active = true;
  ELSIF current_status_name = 'out_for_delivery' THEN
    RETURN QUERY
    SELECT os.id, os.name, os.display_name, os.description 
    FROM order_status os 
    WHERE os.name IN ('delivered', 'failed') AND os.is_active = true;
  ELSIF current_status_name = 'delivered' THEN
    RETURN QUERY
    SELECT os.id, os.name, os.display_name, os.description 
    FROM order_status os 
    WHERE os.name IN ('refunded') AND os.is_active = true;
  ELSE
    -- For cancelled, failed, refunded - no further transitions typically allowed
    RETURN;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Check if this is a seeded admin user
  IF NEW.email IN ('mwangiwanjiku033@gmail.com', 'admin@jncrafts.com', 'justintheurimbugua@gmail.com') THEN
    -- Grant admin role immediately for seeded admin users
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Regular users get customer role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer');
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    order_record RECORD;
BEGIN
    -- Only trigger on status updates, not inserts
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Log the status change for debugging
        INSERT INTO admin_audit_log (
            admin_user_id,
            action,
            table_name,
            record_id,
            accessed_data
        ) VALUES (
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
            'status_change',
            'orders',
            NEW.id,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'order_number', NEW.order_number
            )
        );
        
        -- Note: Email notification will be handled by the application layer
        -- to avoid dependency on external HTTP calls from triggers
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_order_status_change_normalized()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    old_status_name text;
    new_status_name text;
BEGIN
    -- Only trigger on status updates, not inserts
    IF TG_OP = 'UPDATE' AND OLD.status_id != NEW.status_id THEN
        -- Get status names for logging
        SELECT name INTO old_status_name FROM order_status WHERE id = OLD.status_id;
        SELECT name INTO new_status_name FROM order_status WHERE id = NEW.status_id;
        
        -- Log the status change for debugging
        INSERT INTO admin_audit_log (
            admin_user_id,
            action,
            table_name,
            record_id,
            accessed_data
        ) VALUES (
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
            'status_change',
            'orders',
            NEW.id,
            jsonb_build_object(
                'old_status', old_status_name,
                'new_status', new_status_name,
                'order_number', NEW.order_number
            )
        );
        
        -- Note: Email notification will be handled by the application layer
        -- to avoid dependency on external HTTP calls from triggers
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.hash_email(email_address text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Use pgcrypto extension for secure hashing
  -- This allows for email verification while protecting the actual email
  RETURN encode(digest(lower(trim(email_address)), 'sha256'), 'hex');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = $1 AND role = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_new_arrival(product_new_arrival_date timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT product_new_arrival_date IS NOT NULL 
  AND product_new_arrival_date > (now() - interval '10 days');
$function$
;

CREATE OR REPLACE FUNCTION public.is_product_eligible_for_discount(p_product_id uuid, p_discount_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  discount_record RECORD;
  is_eligible BOOLEAN := FALSE;
BEGIN
  -- Get discount details
  SELECT * INTO discount_record
  FROM discounts
  WHERE id = p_discount_id 
  AND is_active = true
  AND (start_date IS NULL OR start_date <= now())
  AND (end_date IS NULL OR end_date >= now());
  
  -- If discount doesn't exist or isn't active, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if discount applies to all products
  IF discount_record.applies_to = 'all' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if product is specifically included
  IF discount_record.applies_to = 'specific' THEN
    SELECT EXISTS(
      SELECT 1 FROM discount_products 
      WHERE discount_id = p_discount_id 
      AND product_id = p_product_id
    ) INTO is_eligible;
    RETURN is_eligible;
  END IF;
  
  -- Check if product category is included
  IF discount_record.applies_to = 'category' THEN
    SELECT EXISTS(
      SELECT 1 FROM discount_products dp
      JOIN products p ON p.category = dp.category
      WHERE dp.discount_id = p_discount_id 
      AND p.id = p_product_id
    ) INTO is_eligible;
    RETURN is_eligible;
  END IF;
  
  RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_admin_data_access(p_action text, p_table_name text, p_record_id uuid DEFAULT NULL::uuid, p_accessed_data jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only log if user is authenticated and is admin
  IF auth.uid() IS NOT NULL AND is_admin(auth.uid()) THEN
    INSERT INTO public.admin_audit_log (
      admin_user_id,
      action,
      table_name,
      record_id,
      accessed_data,
      ip_address,
      created_at
    ) VALUES (
      auth.uid(),
      p_action,
      p_table_name,
      p_record_id,
      p_accessed_data,
      inet_client_addr(),
      now()
    );
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_profile_access(p_action text, p_profile_id uuid, p_accessed_fields text[] DEFAULT ARRAY['basic_info'::text])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only log admin access to other users' profiles
  IF auth.uid() IS NOT NULL AND is_admin(auth.uid()) THEN
    INSERT INTO public.admin_audit_log (
      admin_user_id,
      action,
      table_name,
      record_id,
      accessed_data,
      ip_address,
      user_agent,
      created_at
    ) VALUES (
      auth.uid(),
      p_action,
      'profiles',
      p_profile_id,
      jsonb_build_object(
        'accessed_fields', p_accessed_fields,
        'timestamp', now(),
        'access_type', 'profile_data'
      ),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent',
      now()
    );
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mask_address(address_text text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF address_text IS NULL OR length(address_text) < 10 THEN
    RETURN '***';
  END IF;
  
  -- Show only general area, mask specific details
  RETURN substring(address_text from 1 for 5) || '***';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mask_phone(phone_number text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF phone_number IS NULL OR length(phone_number) < 4 THEN
    RETURN phone_number;
  END IF;
  
  -- Mask middle digits, show first 2 and last 2
  RETURN substring(phone_number from 1 for 2) || 
         repeat('*', greatest(0, length(phone_number) - 4)) || 
         substring(phone_number from length(phone_number) - 1);
END;
$function$
;

create materialized view "public"."mv_admin_products" as  SELECT id,
    name,
    price,
    category,
    description,
    stock_quantity,
    is_active,
    new_arrival_date,
    thumbnail_index,
    created_at,
    updated_at,
    ( SELECT pi.image_url
           FROM product_images pi
          WHERE (pi.product_id = p.id)
          ORDER BY pi.is_primary DESC NULLS LAST, pi.display_order
         LIMIT 1) AS thumbnail_image,
    ( SELECT count(*) AS count
           FROM product_images pi
          WHERE (pi.product_id = p.id)) AS total_images,
    (EXISTS ( SELECT 1
           FROM product_colors pc
          WHERE (pc.product_id = p.id))) AS has_colors,
    (EXISTS ( SELECT 1
           FROM product_sizes ps
          WHERE (ps.product_id = p.id))) AS has_sizes,
    ( SELECT count(*) AS count
           FROM product_colors pc
          WHERE (pc.product_id = p.id)) AS colors_count,
    ( SELECT count(*) AS count
           FROM product_sizes ps
          WHERE (ps.product_id = p.id)) AS sizes_count
   FROM products p;


create materialized view "public"."mv_products_landing" as  SELECT id,
    name,
    price,
    category,
    stock_quantity,
    new_arrival_date,
    created_at,
    is_active,
    ( SELECT pi.image_url
           FROM product_images pi
          WHERE (pi.product_id = p.id)
          ORDER BY pi.is_primary DESC NULLS LAST, pi.display_order
         LIMIT 1) AS thumbnail_image,
    (EXISTS ( SELECT 1
           FROM product_colors pc
          WHERE (pc.product_id = p.id))) AS has_colors,
    (EXISTS ( SELECT 1
           FROM product_sizes ps
          WHERE (ps.product_id = p.id))) AS has_sizes
   FROM products p
  WHERE (is_active = true);


CREATE OR REPLACE FUNCTION public.prefetch_products_next_page(p_category text DEFAULT 'all'::text, p_current_offset integer DEFAULT 0, p_page_size integer DEFAULT 20)
 RETURNS TABLE(id uuid, name text, price numeric, category text, thumbnail_image text, stock_quantity integer, new_arrival_date timestamp with time zone, created_at timestamp with time zone, has_colors boolean, has_sizes boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET enable_seqscan TO 'off'
AS $function$
    SELECT 
        pl.id,
        pl.name,
        pl.price,
        pl.category,
        pl.thumbnail_image,
        pl.stock_quantity,
        pl.new_arrival_date,
        pl.created_at,
        pl.has_colors,
        pl.has_sizes
    FROM public.mv_products_landing pl
    WHERE pl.is_active = true
      AND (p_category = 'all' OR pl.category = p_category)
    ORDER BY pl.created_at DESC
    LIMIT p_page_size
    OFFSET (p_current_offset + p_page_size);
$function$
;

create or replace view "public"."profiles_secure" as  SELECT id,
    user_id,
    created_at,
    updated_at,
        CASE
            WHEN (user_id = auth.uid()) THEN full_name
            WHEN is_admin(auth.uid()) THEN full_name
            ELSE NULL::text
        END AS full_name,
        CASE
            WHEN (user_id = auth.uid()) THEN phone
            WHEN is_admin(auth.uid()) THEN mask_phone(phone)
            ELSE NULL::text
        END AS phone,
        CASE
            WHEN (user_id = auth.uid()) THEN address
            WHEN is_admin(auth.uid()) THEN mask_address(address)
            ELSE NULL::text
        END AS address
   FROM profiles p;


CREATE OR REPLACE FUNCTION public.refresh_admin_products_view()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW public.mv_admin_products;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_all_product_views()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_products_landing;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_admin_products;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_products_landing_view()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW public.mv_products_landing;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.stock_alert_email_hash_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Always hash the email when inserting or updating
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.email != OLD.email) THEN
    NEW.email_hash := public.hash_email(NEW.email);
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.conversations 
  SET updated_at = NEW.created_at 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_product_images_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_discount_code(p_code text, p_order_total numeric DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  discount_record RECORD;
BEGIN
  -- Normalize the code to uppercase
  p_code := UPPER(TRIM(p_code));
  
  -- Check if code exists and is valid
  SELECT * INTO discount_record
  FROM discounts
  WHERE code = p_code
    AND is_active = true
    AND requires_code = true
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now());
  
  -- If discount doesn't exist or isn't valid
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'invalid_code',
      'message', 'This promo code is not valid or has expired'
    );
  END IF;
  
  -- Check usage limits
  IF discount_record.usage_limit IS NOT NULL AND discount_record.used_count >= discount_record.usage_limit THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'usage_limit_exceeded',
      'message', 'This promo code has reached its usage limit'
    );
  END IF;
  
  -- Check minimum order amount
  IF discount_record.min_order_amount IS NOT NULL AND p_order_total < discount_record.min_order_amount THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'min_order_not_met',
      'message', 'Minimum order of $' || discount_record.min_order_amount || ' required for this code'
    );
  END IF;
  
  -- Return valid discount (only safe fields)
  RETURN jsonb_build_object(
    'valid', true,
    'discount', jsonb_build_object(
      'id', discount_record.id,
      'name', discount_record.name,
      'description', discount_record.description,
      'discount_type', discount_record.discount_type,
      'discount_value', discount_record.discount_value,
      'code', discount_record.code
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_guest_session(p_session_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.validate_guest_session_secure(p_session_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_guest_session_secure(p_session_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Additional validation: session ID should be sufficiently long and complex
  IF p_session_id IS NULL OR length(p_session_id) < 32 THEN
    RETURN false;
  END IF;
  
  -- Check if session exists and hasn't expired, with additional staleness check
  RETURN EXISTS (
    SELECT 1 
    FROM public.guest_sessions 
    WHERE session_id = p_session_id 
      AND expires_at > now()
      AND last_accessed > (now() - interval '7 days')
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_order_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Validate required fields
    IF NEW.user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required for order creation';
    END IF;
    
    IF NEW.customer_info IS NULL OR 
       NEW.customer_info->>'fullName' IS NULL OR 
       NEW.customer_info->>'email' IS NULL THEN
        RAISE EXCEPTION 'Complete customer information is required';
    END IF;
    
    IF NEW.shipping_address IS NULL OR
       NEW.shipping_address->>'address' IS NULL OR
       NEW.shipping_address->>'city' IS NULL THEN
        RAISE EXCEPTION 'Complete shipping address is required';
    END IF;
    
    IF NEW.total_amount IS NULL OR NEW.total_amount <= 0 THEN
        RAISE EXCEPTION 'Valid total amount is required';
    END IF;
    
    -- Generate order number if not provided
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_order_number();
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_email_match(stored_hash text, input_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN stored_hash = public.hash_email(input_email);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_stock_alert_email(p_alert_id uuid, p_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  stored_hash text;
BEGIN
  -- Only allow users to verify their own alerts or admins
  SELECT email_hash INTO stored_hash
  FROM public.stock_alerts 
  WHERE id = p_alert_id 
    AND (user_id = auth.uid() OR is_admin(auth.uid()));
  
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN public.verify_email_match(stored_hash, p_email);
END;
$function$
;

CREATE INDEX idx_mv_admin_products_created_id ON public.mv_admin_products USING btree (created_at DESC, id DESC);

CREATE INDEX idx_mv_products_landing_active_category_created ON public.mv_products_landing USING btree (is_active, category, created_at DESC) WHERE (is_active = true);

CREATE INDEX idx_mv_products_landing_active_created ON public.mv_products_landing USING btree (is_active, created_at DESC) WHERE (is_active = true);

CREATE INDEX idx_mv_products_landing_all_active ON public.mv_products_landing USING btree (created_at DESC) WHERE (is_active = true);

CREATE INDEX idx_mv_products_landing_performance ON public.mv_products_landing USING btree (is_active, category, created_at DESC) WHERE (is_active = true);

CREATE INDEX mv_admin_products_created_at_idx ON public.mv_admin_products USING btree (created_at DESC);

CREATE UNIQUE INDEX mv_admin_products_id_idx ON public.mv_admin_products USING btree (id);

CREATE INDEX mv_products_landing_category_idx ON public.mv_products_landing USING btree (category);

CREATE INDEX mv_products_landing_created_at_idx ON public.mv_products_landing USING btree (created_at DESC);

CREATE UNIQUE INDEX mv_products_landing_id_idx ON public.mv_products_landing USING btree (id);


  create policy "about_media_admin_delete"
  on "public"."about_media"
  as permissive
  for delete
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "about_media_admin_insert"
  on "public"."about_media"
  as permissive
  for insert
  to public
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "about_media_admin_update"
  on "public"."about_media"
  as permissive
  for update
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text))
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "about_media_select_policy"
  on "public"."about_media"
  as permissive
  for select
  to public
using ((((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text) OR true));



  create policy "Admins can view their own audit log"
  on "public"."admin_audit_log"
  as permissive
  for select
  to public
using ((( SELECT auth.role() AS role) = 'admin'::text));



  create policy "System can insert audit logs"
  on "public"."admin_audit_log"
  as permissive
  for insert
  to public
with check ((( SELECT auth.role() AS role) = 'service_role'::text));



  create policy "cart_items_delete_policy"
  on "public"."cart_items"
  as permissive
  for delete
  to public
using (((user_id = auth.uid()) OR ((user_id IS NULL) AND (session_id IS NOT NULL))));



  create policy "cart_items_insert_policy"
  on "public"."cart_items"
  as permissive
  for insert
  to public
with check (((user_id = auth.uid()) OR ((user_id IS NULL) AND (session_id IS NOT NULL))));



  create policy "cart_items_select_policy"
  on "public"."cart_items"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR ((user_id IS NULL) AND (session_id IS NOT NULL))));



  create policy "cart_items_update_policy"
  on "public"."cart_items"
  as permissive
  for update
  to public
using (((user_id = auth.uid()) OR ((user_id IS NULL) AND (session_id IS NOT NULL))))
with check (((user_id = auth.uid()) OR ((user_id IS NULL) AND (session_id IS NOT NULL))));



  create policy "categories_delete_policy"
  on "public"."categories"
  as permissive
  for delete
  to public
using (is_admin(( SELECT auth.uid() AS uid)));



  create policy "categories_insert_policy"
  on "public"."categories"
  as permissive
  for insert
  to public
with check (is_admin(( SELECT auth.uid() AS uid)));



  create policy "categories_select_policy"
  on "public"."categories"
  as permissive
  for select
  to public
using ((is_admin(( SELECT auth.uid() AS uid)) OR (is_active = true)));



  create policy "categories_update_policy"
  on "public"."categories"
  as permissive
  for update
  to public
using (is_admin(( SELECT auth.uid() AS uid)))
with check (is_admin(( SELECT auth.uid() AS uid)));



  create policy "colors_admin_delete"
  on "public"."colors"
  as permissive
  for delete
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "colors_admin_insert"
  on "public"."colors"
  as permissive
  for insert
  to public
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "colors_admin_update"
  on "public"."colors"
  as permissive
  for update
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text))
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "colors_select_policy"
  on "public"."colors"
  as permissive
  for select
  to public
using ((((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text) OR true));



  create policy "Admins can update conversations"
  on "public"."conversations"
  as permissive
  for update
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text))
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "Users can create their own conversations"
  on "public"."conversations"
  as permissive
  for insert
  to public
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Users can view their own conversations"
  on "public"."conversations"
  as permissive
  for select
  to public
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "discount_products_admin_delete"
  on "public"."discount_products"
  as permissive
  for delete
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "discount_products_admin_insert"
  on "public"."discount_products"
  as permissive
  for insert
  to public
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "discount_products_admin_update"
  on "public"."discount_products"
  as permissive
  for update
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text))
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "discount_products_select_policy"
  on "public"."discount_products"
  as permissive
  for select
  to public
using ((((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text) OR true));



  create policy "discounts_admin_delete"
  on "public"."discounts"
  as permissive
  for delete
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "discounts_admin_insert"
  on "public"."discounts"
  as permissive
  for insert
  to public
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "discounts_admin_update"
  on "public"."discounts"
  as permissive
  for update
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text))
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "discounts_select_policy"
  on "public"."discounts"
  as permissive
  for select
  to public
using ((((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text) OR true));



  create policy "guest_sessions_anon_insert"
  on "public"."guest_sessions"
  as permissive
  for insert
  to public
with check (true);



  create policy "guest_sessions_select"
  on "public"."guest_sessions"
  as permissive
  for select
  to public
using (true);



  create policy "guest_sessions_update"
  on "public"."guest_sessions"
  as permissive
  for update
  to public
using (true)
with check (true);



  create policy "homepage_featured_admin_delete"
  on "public"."homepage_featured"
  as permissive
  for delete
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "homepage_featured_admin_insert"
  on "public"."homepage_featured"
  as permissive
  for insert
  to public
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "homepage_featured_admin_update"
  on "public"."homepage_featured"
  as permissive
  for update
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text))
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "homepage_featured_select_policy"
  on "public"."homepage_featured"
  as permissive
  for select
  to public
using ((((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text) OR (is_active = true)));



  create policy "invoice_receipts_admin_access"
  on "public"."invoice_receipts"
  as permissive
  for all
  to authenticated
using ((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))
with check ((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text));



  create policy "Users can create messages in their conversations"
  on "public"."messages"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM conversations
  WHERE ((conversations.id = messages.conversation_id) AND (conversations.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "Users can view messages in their conversations"
  on "public"."messages"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM conversations
  WHERE ((conversations.id = messages.conversation_id) AND (conversations.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "Users can create order items for their orders"
  on "public"."order_items"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "Users can view their order items"
  on "public"."order_items"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "order_status_admin_delete"
  on "public"."order_status"
  as permissive
  for delete
  to authenticated
using ((( SELECT auth.role() AS role) = 'admin'::text));



  create policy "order_status_admin_insert"
  on "public"."order_status"
  as permissive
  for insert
  to authenticated
with check ((( SELECT auth.role() AS role) = 'admin'::text));



  create policy "order_status_admin_update"
  on "public"."order_status"
  as permissive
  for update
  to authenticated
using ((( SELECT auth.role() AS role) = 'admin'::text))
with check ((( SELECT auth.role() AS role) = 'admin'::text));



  create policy "order_status_select_policy"
  on "public"."order_status"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.role() AS role) = 'admin'::text));



  create policy "admins_full_access"
  on "public"."orders"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "orders_admin_delete"
  on "public"."orders"
  as permissive
  for delete
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "service_role_full_access"
  on "public"."orders"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "users_insert_own_orders"
  on "public"."orders"
  as permissive
  for insert
  to authenticated
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "users_select_own_orders"
  on "public"."orders"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "product_colors_admin_delete"
  on "public"."product_colors"
  as permissive
  for delete
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "product_colors_admin_insert"
  on "public"."product_colors"
  as permissive
  for insert
  to public
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "product_colors_admin_update"
  on "public"."product_colors"
  as permissive
  for update
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text))
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "product_colors_select_policy"
  on "public"."product_colors"
  as permissive
  for select
  to public
using ((((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text) OR true));



  create policy "product_images_admin_delete"
  on "public"."product_images"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'admin'::user_role)))));



  create policy "product_images_admin_insert"
  on "public"."product_images"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'admin'::user_role)))));



  create policy "product_images_admin_update"
  on "public"."product_images"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'admin'::user_role)))))
with check ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'admin'::user_role)))));



  create policy "product_images_public_read"
  on "public"."product_images"
  as permissive
  for select
  to public
using (true);



  create policy "product_inventory_admin_delete"
  on "public"."product_inventory"
  as permissive
  for delete
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "product_inventory_admin_insert"
  on "public"."product_inventory"
  as permissive
  for insert
  to public
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "product_inventory_admin_update"
  on "public"."product_inventory"
  as permissive
  for update
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text))
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "product_inventory_select_policy"
  on "public"."product_inventory"
  as permissive
  for select
  to public
using ((((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text) OR true));



  create policy "product_sizes_admin_delete"
  on "public"."product_sizes"
  as permissive
  for delete
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "product_sizes_admin_insert"
  on "public"."product_sizes"
  as permissive
  for insert
  to public
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "product_sizes_admin_update"
  on "public"."product_sizes"
  as permissive
  for update
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text))
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "product_sizes_select_policy"
  on "public"."product_sizes"
  as permissive
  for select
  to public
using ((((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text) OR true));



  create policy "products_delete_policy"
  on "public"."products"
  as permissive
  for delete
  to public
using (is_admin(( SELECT auth.uid() AS uid)));



  create policy "products_insert_policy"
  on "public"."products"
  as permissive
  for insert
  to public
with check (is_admin(( SELECT auth.uid() AS uid)));



  create policy "products_select_policy"
  on "public"."products"
  as permissive
  for select
  to public
using ((is_admin(( SELECT auth.uid() AS uid)) OR (is_active = true)));



  create policy "products_update_policy"
  on "public"."products"
  as permissive
  for update
  to public
using (is_admin(( SELECT auth.uid() AS uid)))
with check (is_admin(( SELECT auth.uid() AS uid)));



  create policy "Admins or users can delete profiles - strict"
  on "public"."profiles"
  as permissive
  for delete
  to public
using ((((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text) OR (id = ( SELECT auth.uid() AS uid))));



  create policy "Admins or users can update profiles"
  on "public"."profiles"
  as permissive
  for update
  to authenticator, authenticated, anon
using (((( SELECT auth.role() AS role) = 'admin'::text) OR (id = ( SELECT auth.uid() AS uid))));



  create policy "Admins or users can view profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticator, dashboard_user, authenticated, anon
using (((( SELECT auth.role() AS role) = 'admin'::text) OR (id = ( SELECT auth.uid() AS uid))));



  create policy "Users can insert their own profile"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "settings_admin_policy"
  on "public"."settings"
  as permissive
  for all
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text))
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "sizes_admin_delete"
  on "public"."sizes"
  as permissive
  for delete
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "sizes_admin_insert"
  on "public"."sizes"
  as permissive
  for insert
  to public
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "sizes_admin_update"
  on "public"."sizes"
  as permissive
  for update
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text))
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "sizes_select_policy"
  on "public"."sizes"
  as permissive
  for select
  to public
using ((((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text) OR true));



  create policy "stock_alerts_delete_policy"
  on "public"."stock_alerts"
  as permissive
  for delete
  to authenticated
using (((( SELECT auth.uid() AS uid) = user_id) OR (( SELECT auth.role() AS role) = 'admin'::text)));



  create policy "stock_alerts_insert_policy"
  on "public"."stock_alerts"
  as permissive
  for insert
  to authenticated
with check (((( SELECT auth.uid() AS uid) = user_id) OR (( SELECT auth.role() AS role) = 'admin'::text)));



  create policy "stock_alerts_select_policy"
  on "public"."stock_alerts"
  as permissive
  for select
  to authenticated
using (((( SELECT auth.uid() AS uid) = user_id) OR (( SELECT auth.role() AS role) = 'admin'::text)));



  create policy "stock_alerts_update_policy"
  on "public"."stock_alerts"
  as permissive
  for update
  to authenticated
using (((( SELECT auth.uid() AS uid) = user_id) OR (( SELECT auth.role() AS role) = 'admin'::text)))
with check (((( SELECT auth.uid() AS uid) = user_id) OR (( SELECT auth.role() AS role) = 'admin'::text)));



  create policy "Everyone can view timezones"
  on "public"."timezones"
  as permissive
  for select
  to public
using (true);



  create policy "Admins can create roles"
  on "public"."user_roles"
  as permissive
  for insert
  to public
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "Admins can delete roles"
  on "public"."user_roles"
  as permissive
  for delete
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "Admins can update roles"
  on "public"."user_roles"
  as permissive
  for update
  to public
using (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text))
with check (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = 'admin'::text));



  create policy "Admins or users can view roles"
  on "public"."user_roles"
  as permissive
  for select
  to public
using (((( SELECT auth.role() AS role) = 'admin'::text) OR (user_id = ( SELECT auth.uid() AS uid))));



  create policy "Users can create their own wishlist items"
  on "public"."wishlist_items"
  as permissive
  for insert
  to public
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Users can delete their own wishlist items"
  on "public"."wishlist_items"
  as permissive
  for delete
  to public
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Users can view their own wishlist"
  on "public"."wishlist_items"
  as permissive
  for select
  to public
using ((user_id = ( SELECT auth.uid() AS uid)));


CREATE TRIGGER update_about_media_updated_at BEFORE UPDATE ON public.about_media FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discounts_updated_at BEFORE UPDATE ON public.discounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_on_new_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

CREATE TRIGGER update_order_status_updated_at BEFORE UPDATE ON public.order_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER handle_order_status_change_normalized_trigger AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION handle_order_status_change_normalized();

CREATE TRIGGER order_status_change_trigger AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION handle_order_status_change();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER validate_order_trigger BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION validate_order_data();

CREATE TRIGGER update_product_images_updated_at BEFORE UPDATE ON public.product_images FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_images_updated_at_trigger BEFORE UPDATE ON public.product_images FOR EACH ROW EXECUTE FUNCTION update_product_images_updated_at();

CREATE TRIGGER update_product_inventory_updated_at BEFORE UPDATE ON public.product_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER stock_alert_check AFTER UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION check_stock_alerts();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER stock_alert_hash_email BEFORE INSERT OR UPDATE ON public.stock_alerts FOR EACH ROW EXECUTE FUNCTION stock_alert_email_hash_trigger();


