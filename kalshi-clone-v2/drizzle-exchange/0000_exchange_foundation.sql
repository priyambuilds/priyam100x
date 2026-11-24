CREATE TYPE "public"."cash_account_kind" AS ENUM('EXTERNAL', 'USER_WALLET', 'MARKET_ESCROW');--> statement-breakpoint
CREATE TYPE "public"."contract_account_kind" AS ENUM('ISSUER', 'USER_POSITION');--> statement-breakpoint
CREATE TYPE "public"."fill_kind" AS ENUM('TRANSFER', 'MINT', 'MERGE');--> statement-breakpoint
CREATE TYPE "public"."ledger_transaction_kind" AS ENUM('DEPOSIT', 'SPLIT', 'MERGE', 'TRADE', 'SETTLEMENT', 'REVERSAL');--> statement-breakpoint
CREATE TYPE "public"."market_status" AS ENUM('OPEN', 'CLOSED', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."order_side" AS ENUM('BUY', 'SELL');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('OPEN', 'FILLED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."outcome" AS ENUM('YES', 'NO');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "cash_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "cash_account_kind" NOT NULL,
	"user_id" uuid,
	"market_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_account_valid_user" CHECK (
        ("cash_account"."kind" = 'EXTERNAL' AND "cash_account"."user_id" IS NULL AND "cash_account"."market_id" IS NULL)
        OR ("cash_account"."kind" = 'USER_WALLET' AND "cash_account"."user_id" IS NOT NULL AND "cash_account"."market_id" IS NULL)
        OR ("cash_account"."kind" = 'MARKET_ESCROW' AND "cash_account"."user_id" IS NULL AND "cash_account"."market_id" IS NOT NULL)
      )
);
--> statement-breakpoint
CREATE TABLE "cash_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"from_account_id" uuid NOT NULL,
	"to_account_id" uuid NOT NULL,
	"amount_cents" bigint NOT NULL,
	CONSTRAINT "cash_transfers_positive" CHECK ("cash_transfers"."amount_cents" > 0),
	CONSTRAINT "cash_transfers_distinct_ends" CHECK ("cash_transfers"."from_account_id" <> "cash_transfers"."to_account_id")
);
--> statement-breakpoint
CREATE TABLE "contract_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "contract_account_kind" NOT NULL,
	"market_id" uuid NOT NULL,
	"outcome" "outcome" NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_account_id_market_outcome_unique" UNIQUE("id","market_id","outcome"),
	CONSTRAINT "contracts_account_valid_owner" CHECK (
        ("contract_accounts"."kind" = 'ISSUER' AND "contract_accounts"."user_id" IS NULL)
        OR
        ("contract_accounts"."kind" = 'USER_POSITION' AND "contract_accounts"."user_id" IS NOT NULL)
      )
);
--> statement-breakpoint
CREATE TABLE "contract_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"outcome" "outcome" NOT NULL,
	"from_account_id" uuid NOT NULL,
	"to_account_id" uuid NOT NULL,
	"quantity" bigint NOT NULL,
	CONSTRAINT "contract_transfers_positive" CHECK ("contract_transfers"."quantity" > 0),
	CONSTRAINT "contract_transfers_distinct_ends" CHECK ("contract_transfers"."from_account_id" <> "contract_transfers"."to_account_id")
);
--> statement-breakpoint
CREATE TABLE "fills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"maker_order_id" uuid NOT NULL,
	"taker_order_id" uuid NOT NULL,
	"ledger_transaction_id" uuid NOT NULL,
	"kind" "fill_kind" NOT NULL,
	"yes_price_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fills_ledger_transaction_id_unique" UNIQUE("ledger_transaction_id"),
	CONSTRAINT "fills_distinct_orders" CHECK ("fills"."maker_order_id" <> "fills"."taker_order_id"),
	CONSTRAINT "fills_valid_price" CHECK ("fills"."yes_price_cents" BETWEEN 1 AND 99),
	CONSTRAINT "fills_positive_quantity" CHECK ("fills"."quantity" >0 )
);
--> statement-breakpoint
CREATE TABLE "ledger_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "ledger_transaction_kind" NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"market_id" uuid,
	"request_id" text,
	"reverses_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_actor_request_unique" UNIQUE("actor_user_id","request_id"),
	CONSTRAINT "ledger_reverse_once" UNIQUE("reverses_transaction_id"),
	CONSTRAINT "ledger_id_market_unique" UNIQUE("id","market_id"),
	CONSTRAINT "ledger_valid_market" CHECK (
        ("ledger_transactions"."kind" = 'DEPOSIT' AND "ledger_transactions"."market_id" IS NULL)
        OR ("ledger_transactions"."kind" IN ('SPLIT', 'MERGE', 'SETTLEMENT', 'TRADE') AND "ledger_transactions"."market_id" IS NOT NULL)
        OR "ledger_transactions"."kind" = 'REVERSAL'
      ),
	CONSTRAINT "ledger_valid_request" CHECK (
        ("ledger_transactions"."kind" = 'TRADE' AND "ledger_transactions"."request_id" IS NULL)
        OR 
        ("ledger_transactions"."kind" <> 'TRADE' AND "ledger_transactions"."request_id" IS NOT NULL AND length(trim("ledger_transactions"."request_id")) BETWEEN 1 AND 100)
      ),
	CONSTRAINT "ledger_valid_reversal" CHECK (
        ("ledger_transactions"."kind" = 'REVERSAL' AND "ledger_transactions"."reverses_transaction_id" IS NOT NULL AND "ledger_transactions"."reverses_transaction_id" <> "ledger_transactions"."id")
        OR ("ledger_transactions"."kind" <> 'REVERSAL' AND "ledger_transactions"."reverses_transaction_id" IS NULL)
      )
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"resolution_criteria" text NOT NULL,
	"status" "market_status" DEFAULT 'OPEN' NOT NULL,
	"resolution" "outcome",
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"closes_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_valid_times" CHECK (
        "markets"."closes_at" > "markets"."created_at"
        AND ("markets"."closed_at" IS NULL OR "markets"."closed_at" >= "markets"."created_at")
        AND ("markets"."resolved_at" IS NULL OR "markets"."resolved_at" >= "markets"."closed_at") 
      ),
	CONSTRAINT "market_valid_state" CHECK (
        ("markets"."status" = 'OPEN'
          AND "markets"."closed_at" IS NULL
          AND "markets"."resolution" IS NULL
          AND "markets"."resolved_at" IS NULL
          AND "markets"."resolved_by" IS NULL
        )
        OR 
        ("markets"."status" = 'CLOSED'
          AND "markets"."closed_at" IS NOT NULL
          AND "markets"."resolution" IS NULL
          AND "markets"."resolved_at" IS NULL
          AND "markets"."resolved_by" IS NULL
        )
        OR
        ("markets"."status"= 'RESOLVED'
          AND "markets"."closed_at" IS NOT NULL
          AND "markets"."resolution" IS NOT NULL
          AND "markets"."resolved_at" IS NOT NULL
          AND "markets"."resolved_by" IS NOT NULL
        )
      )
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence" bigserial NOT NULL,
	"user_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"side" "order_side" NOT NULL,
	"outcome" "outcome" NOT NULL,
	"limit_price_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	"remaining_quantity" integer NOT NULL,
	"status" "order_status" DEFAULT 'OPEN' NOT NULL,
	"request_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "orders_sequence_unique" UNIQUE("sequence"),
	CONSTRAINT "orders_id_market_unique" UNIQUE("id","market_id"),
	CONSTRAINT "orders_user_market_request_unique" UNIQUE("user_id","market_id","request_id"),
	CONSTRAINT "orders_valid_state" CHECK (
        ("orders"."status" = 'OPEN' AND "orders"."remaining_quantity" > 0 AND "orders"."cancelled_at" IS NULL)
        OR ("orders"."status" = 'FILLED' AND "orders"."remaining_quantity" = 0 AND "orders"."cancelled_at" IS NULL)
        OR ("orders"."status" = 'CANCELLED' AND "orders"."remaining_quantity" > 0 AND "orders"."cancelled_at" IS NOT NULL)
      ),
	CONSTRAINT "orders_valid_price" CHECK ("orders"."limit_price_cents" BETWEEN 1 AND 99),
	CONSTRAINT "orders_valid_request" CHECK (length(trim("orders"."request_id")) BETWEEN 1 AND 100),
	CONSTRAINT "order_valid_quantities" CHECK ("orders"."quantity" > 0 AND "orders"."remaining_quantity" BETWEEN 0 AND "orders"."quantity")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "cash_account" ADD CONSTRAINT "cash_account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_account" ADD CONSTRAINT "cash_account_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_transfers" ADD CONSTRAINT "cash_transfers_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_transfers" ADD CONSTRAINT "cash_transfers_from_account_id_cash_account_id_fk" FOREIGN KEY ("from_account_id") REFERENCES "public"."cash_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_transfers" ADD CONSTRAINT "cash_transfers_to_account_id_cash_account_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."cash_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_accounts" ADD CONSTRAINT "contract_accounts_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_accounts" ADD CONSTRAINT "contract_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_transfers" ADD CONSTRAINT "contract_transfers_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_transfers" ADD CONSTRAINT "contract_transfers_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_transfers" ADD CONSTRAINT "contract_transfers_event_market_fk" FOREIGN KEY ("transaction_id","market_id") REFERENCES "public"."ledger_transactions"("id","market_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_transfers" ADD CONSTRAINT "contract_transfers_source_fk" FOREIGN KEY ("from_account_id","market_id","outcome") REFERENCES "public"."contract_accounts"("id","market_id","outcome") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_transfers" ADD CONSTRAINT "contract_transfers_destination_fk" FOREIGN KEY ("to_account_id","market_id","outcome") REFERENCES "public"."contract_accounts"("id","market_id","outcome") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fills" ADD CONSTRAINT "fills_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fills" ADD CONSTRAINT "fills_maker_market_fk" FOREIGN KEY ("maker_order_id","market_id") REFERENCES "public"."orders"("id","market_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fills" ADD CONSTRAINT "fills_taker_market_fk" FOREIGN KEY ("taker_order_id","market_id") REFERENCES "public"."orders"("id","market_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fills" ADD CONSTRAINT "fills_event_market_fk" FOREIGN KEY ("ledger_transaction_id","market_id") REFERENCES "public"."ledger_transactions"("id","market_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_reversal_original_fk" FOREIGN KEY ("reverses_transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cash_accounts_one_external_funding" ON "cash_account" USING btree ("kind") WHERE "cash_account"."kind" = 'EXTERNAL';--> statement-breakpoint
CREATE UNIQUE INDEX "cash_accounts_one_wallet_per_user" ON "cash_account" USING btree ("user_id") WHERE "cash_account"."kind" = 'USER_WALLET';--> statement-breakpoint
CREATE UNIQUE INDEX "cash_accounts_one_escrow_per_market" ON "cash_account" USING btree ("market_id") WHERE "cash_account"."kind" = 'MARKET_ESCROW';--> statement-breakpoint
CREATE INDEX "cash_transactions_idx" ON "cash_transfers" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "cash_transfers_from_idx" ON "cash_transfers" USING btree ("from_account_id");--> statement-breakpoint
CREATE INDEX "cash_transfers_to_idx" ON "cash_transfers" USING btree ("to_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contracts_account_one_issuer_per_outcome" ON "contract_accounts" USING btree ("market_id","outcome") WHERE "contract_accounts"."kind" = 'ISSUER';--> statement-breakpoint
CREATE UNIQUE INDEX "contracts_account_one_position_per_user" ON "contract_accounts" USING btree ("user_id","market_id","outcome") WHERE "contract_accounts"."kind" = 'USER_POSITION';--> statement-breakpoint
CREATE INDEX "contract_transactions_idx" ON "contract_transfers" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "contract_transfers_from_idx" ON "contract_transfers" USING btree ("from_account_id");--> statement-breakpoint
CREATE INDEX "contract_transfers_to_idx" ON "contract_transfers" USING btree ("to_account_id");--> statement-breakpoint
CREATE INDEX "fills_market_time_idx" ON "fills" USING btree ("market_id","created_at");--> statement-breakpoint
CREATE INDEX "fills_maker_idx" ON "fills" USING btree ("maker_order_id");--> statement-breakpoint
CREATE INDEX "fills_taker_idx" ON "fills" USING btree ("taker_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_one_settlement_per_market" ON "ledger_transactions" USING btree ("market_id") WHERE "ledger_transactions"."kind" = 'SETTLEMENT';--> statement-breakpoint
CREATE INDEX "ledger_market_time_idx" ON "ledger_transactions" USING btree ("market_id","created_at");--> statement-breakpoint
CREATE INDEX "markets_status_closes_idx" ON "markets" USING btree ("status","closes_at");--> statement-breakpoint
CREATE INDEX "orders_open_asks_idx" ON "orders" USING btree ("market_id","outcome","limit_price_cents","sequence") WHERE "orders"."status" = 'OPEN' AND "orders"."side" = 'SELL';--> statement-breakpoint
CREATE INDEX "orders_open_bids_idx" ON "orders" USING btree ("market_id","outcome","limit_price_cents" DESC NULLS LAST,"sequence") WHERE "orders"."status" = 'OPEN' AND "orders"."side" = 'BUY';--> statement-breakpoint
CREATE INDEX "orders_users_status_idx" ON "orders" USING btree ("user_id","status");