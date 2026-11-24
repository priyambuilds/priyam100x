import { sql } from "drizzle-orm"
import {
  bigint,
  bigserial,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

// Helpers
const id = () => uuid("id").defaultRandom().primaryKey()
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
const instant = (name: string) => timestamp(name, { withTimezone: true })

// Enums
export const userRole = pgEnum("user_role", ["USER", "ADMIN"])
export const outcome = pgEnum("outcome", ["YES", "NO"])
export const marketStatus = pgEnum("market_status", ["OPEN", "CLOSED", "RESOLVED"])
export const cashAccountKind = pgEnum("cash_account_kind", ["EXTERNAL", "USER_WALLET", "MARKET_ESCROW"])
export const contractAccountKind = pgEnum("contract_account_kind", ["ISSUER", "USER_POSITION"])
export const ledgerTransactionKind = pgEnum("ledger_transaction_kind", [
  "DEPOSIT",
  "SPLIT",
  "MERGE",
  "TRADE",
  "SETTLEMENT",
  "REVERSAL",
])
export const orderSide = pgEnum("order_side", ["BUY", "SELL"])
export const orderStatus = pgEnum("order_status", ["OPEN", "FILLED", "CANCELLED"])
export const fillKind = pgEnum("fill_kind", ["TRANSFER", "MINT", "MERGE"])

// Tables
export const users = pgTable("users", {
  id: id(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("USER"),

  createdAt: createdAt(),
})

export const markets = pgTable(
  "markets",
  {
    id: id(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    title: text("title").notNull(),
    description: text("description"),
    resolutionCriteria: text("resolution_criteria").notNull(),

    status: marketStatus("status").notNull().default("OPEN"),
    resolution: outcome("resolution"),
    resolvedAt: instant("resolved_at"),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "restrict" }),

    closesAt: instant("closes_at").notNull(),
    closedAt: instant("closed_at"),
    createdAt: createdAt(),
  },
  (m) => [
    index("markets_status_closes_idx").on(m.status, m.closesAt),
    check(
      "market_valid_times",
      sql`
        ${m.closesAt} > ${m.createdAt}
        AND (${m.closedAt} IS NULL OR ${m.closedAt} >= ${m.createdAt})
        AND (${m.resolvedAt} IS NULL OR ${m.resolvedAt} >= ${m.closedAt}) 
      `,
    ),
    check(
      "market_valid_state",
      sql`
        (${m.status} = 'OPEN'
          AND ${m.closedAt} IS NULL
          AND ${m.resolution} IS NULL
          AND ${m.resolvedAt} IS NULL
          AND ${m.resolvedBy} IS NULL
        )
        OR 
        (${m.status} = 'CLOSED'
          AND ${m.closedAt} IS NOT NULL
          AND ${m.resolution} IS NULL
          AND ${m.resolvedAt} IS NULL
          AND ${m.resolvedBy} IS NULL
        )
        OR
        (${m.status}= 'RESOLVED'
          AND ${m.closedAt} IS NOT NULL
          AND ${m.resolution} IS NOT NULL
          AND ${m.resolvedAt} IS NOT NULL
          AND ${m.resolvedBy} IS NOT NULL
        )
      `,
    ),
  ],
)

export const cashAccounts = pgTable(
  "cash_account",
  {
    id: id(),
    kind: cashAccountKind("kind").notNull(),

    userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }),
    marketId: uuid("market_id").references(() => markets.id, { onDelete: "restrict" }),

    createdAt: createdAt(),
  },
  (a) => [
    check(
      "cash_account_valid_user",
      sql`
        (${a.kind} = 'EXTERNAL' AND ${a.userId} IS NULL AND ${a.marketId} IS NULL)
        OR (${a.kind} = 'USER_WALLET' AND ${a.userId} IS NOT NULL AND ${a.marketId} IS NULL)
        OR (${a.kind} = 'MARKET_ESCROW' AND ${a.userId} IS NULL AND ${a.marketId} IS NOT NULL)
      `,
    ),
    uniqueIndex("cash_accounts_one_external_funding")
      .on(a.kind)
      .where(sql`${a.kind} = 'EXTERNAL'`),
    uniqueIndex("cash_accounts_one_wallet_per_user")
      .on(a.userId)
      .where(sql`${a.kind} = 'USER_WALLET'`),
    uniqueIndex("cash_accounts_one_escrow_per_market")
      .on(a.marketId)
      .where(sql`${a.kind} = 'MARKET_ESCROW'`),
  ],
)

export const contractAccounts = pgTable(
  "contract_accounts",
  {
    id: id(),
    kind: contractAccountKind("kind").notNull(),

    marketId: uuid("market_id").notNull().references(() => markets.id, { onDelete: "restrict" }),
    outcome: outcome("outcome").notNull(),

    userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }),

    createdAt: createdAt(),
  },
  (c) => [
    check(
      "contracts_account_valid_owner",
      sql`
        (${c.kind} = 'ISSUER' AND ${c.userId} IS NULL)
        OR
        (${c.kind} = 'USER_POSITION' AND ${c.userId} IS NOT NULL)
      `,
    ),
    uniqueIndex("contracts_account_one_issuer_per_outcome")
      .on(c.marketId, c.outcome)
      .where(sql`${c.kind} = 'ISSUER'`),
    uniqueIndex("contracts_account_one_position_per_user")
      .on(c.userId, c.marketId, c.outcome)
      .where(sql`${c.kind} = 'USER_POSITION'`),
    // Transfer uses this key to verify an endpoint's market and outcome
    // We want PostgreSQL to be able to verify this statement: “Account 17 is a Market A YES account.”
    unique("contracts_account_id_market_outcome_unique").on(c.id, c.marketId, c.outcome),
  ],
)

export const ledgerTransactions = pgTable(
  "ledger_transactions",
  {
    id: id(),
    kind: ledgerTransactionKind("kind").notNull(),

    actorUserId: uuid("actor_user_id")
      .references(() => users.id, { onDelete: "restrict" })
      .notNull(),
    marketId: uuid("market_id").references(() => markets.id, { onDelete: "restrict" }),
    requestId: text("request_id"),
    reversesTransactionId: uuid("reverses_transaction_id"),

    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "ledger_reversal_original_fk",
      columns: [t.reversesTransactionId],
      foreignColumns: [t.id],
    }).onDelete("restrict"),

    unique("ledger_actor_request_unique").on(t.actorUserId, t.requestId),
    unique("ledger_reverse_once").on(t.reversesTransactionId),
    unique("ledger_id_market_unique").on(t.id, t.marketId),

    uniqueIndex("ledger_one_settlement_per_market")
      .on(t.marketId)
      .where(sql`${t.kind} = 'SETTLEMENT'`),

    check(
      "ledger_valid_market",
      sql`
        (${t.kind} = 'DEPOSIT' AND ${t.marketId} IS NULL)
        OR (${t.kind} IN ('SPLIT', 'MERGE', 'SETTLEMENT', 'TRADE') AND ${t.marketId} IS NOT NULL)
        OR ${t.kind} = 'REVERSAL'
      `,
    ),

    check(
      "ledger_valid_request",
      sql`
        (${t.kind} = 'TRADE' AND ${t.requestId} IS NULL)
        OR 
        (${t.kind} <> 'TRADE' AND ${t.requestId} IS NOT NULL AND length(trim(${t.requestId})) BETWEEN 1 AND 100)
      `,
    ),

    check(
      "ledger_valid_reversal",
      sql`
        (${t.kind} = 'REVERSAL' AND ${t.reversesTransactionId} IS NOT NULL AND ${t.reversesTransactionId} <> ${t.id})
        OR (${t.kind} <> 'REVERSAL' AND ${t.reversesTransactionId} IS NULL)
      `,
    ),

    index("ledger_market_time_idx").on(t.marketId, t.createdAt),
  ],
)

export const cashTransfers = pgTable(
  "cash_transfers",
  {
    id: id(),

    transactionId: uuid("transaction_id")
      .references(() => ledgerTransactions.id, { onDelete: "restrict" })
      .notNull(),
    fromAccountId: uuid("from_account_id")
      .references(() => cashAccounts.id, { onDelete: "restrict" })
      .notNull(),
    toAccountId: uuid("to_account_id")
      .references(() => cashAccounts.id, { onDelete: "restrict" })
      .notNull(),

    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
  },
  (t) => [
    check("cash_transfers_positive", sql`${t.amountCents} > 0`),
    check("cash_transfers_distinct_ends", sql`${t.fromAccountId} <> ${t.toAccountId}`),

    index("cash_transactions_idx").on(t.transactionId),
    index("cash_transfers_from_idx").on(t.fromAccountId),
    index("cash_transfers_to_idx").on(t.toAccountId),
  ],
)
// One transfer here reads as:
// “Under transaction T2, move two Market A YES contracts from account 17 to account 24.”
export const contractTransfers = pgTable(
  "contract_transfers",
  {
    id: id(),

    transactionId: uuid("transaction_id")
      .references(() => ledgerTransactions.id, { onDelete: "restrict" })
      .notNull(),
    marketId: uuid("market_id")
      .references(() => markets.id, { onDelete: "restrict" })
      .notNull(),
    outcome: outcome("outcome").notNull(),

    fromAccountId: uuid("from_account_id").notNull(),
    toAccountId: uuid("to_account_id").notNull(),

    quantity: bigint("quantity", { mode: "bigint" }).notNull(),
  },
  (t) => [
    foreignKey({
      name: "contract_transfers_event_market_fk",
      columns: [t.transactionId, t.marketId],
      foreignColumns: [ledgerTransactions.id, ledgerTransactions.marketId],
    }).onDelete("restrict"),

    foreignKey({
      name: "contract_transfers_source_fk",
      columns: [t.fromAccountId, t.marketId, t.outcome],
      foreignColumns: [contractAccounts.id, contractAccounts.marketId, contractAccounts.outcome],
    }).onDelete("restrict"),

    foreignKey({
      name: "contract_transfers_destination_fk",
      columns: [t.toAccountId, t.marketId, t.outcome],
      foreignColumns: [contractAccounts.id, contractAccounts.marketId, contractAccounts.outcome],
    }).onDelete("restrict"),

    check("contract_transfers_positive", sql`${t.quantity} > 0`),
    check("contract_transfers_distinct_ends", sql`${t.fromAccountId} <> ${t.toAccountId}`),

    index("contract_transactions_idx").on(t.transactionId),
    index("contract_transfers_from_idx").on(t.fromAccountId),
    index("contract_transfers_to_idx").on(t.toAccountId),
  ],
)

export const orders = pgTable(
  "orders",
  {
    id: id(),
    sequence: bigserial("sequence", { mode: "bigint" }).notNull().unique(),

    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    marketId: uuid("market_id").notNull().references(() => markets.id, { onDelete: "restrict" }),

    side: orderSide("side").notNull(),
    outcome: outcome("outcome").notNull(),

    limitPriceCents: integer("limit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    remainingQuantity: integer("remaining_quantity").notNull(),

    status: orderStatus("status").notNull().default("OPEN"),
    requestId: text("request_id").notNull(),

    createdAt: createdAt(),
    cancelledAt: instant("cancelled_at"),
  },
  (o) => [
    check(
      "orders_valid_state",
      sql`
        (${o.status} = 'OPEN' AND ${o.remainingQuantity} > 0 AND ${o.cancelledAt} IS NULL)
        OR (${o.status} = 'FILLED' AND ${o.remainingQuantity} = 0 AND ${o.cancelledAt} IS NULL)
        OR (${o.status} = 'CANCELLED' AND ${o.remainingQuantity} > 0 AND ${o.cancelledAt} IS NOT NULL)
      `,
    ),
    check("orders_valid_price", sql`${o.limitPriceCents} BETWEEN 1 AND 99`),
    check("orders_valid_request", sql`length(trim(${o.requestId})) BETWEEN 1 AND 100`),
    check("order_valid_quantities", sql`${o.quantity} > 0 AND ${o.remainingQuantity} BETWEEN 0 AND ${o.quantity}`),

    unique("orders_id_market_unique").on(o.id, o.marketId),
    unique("orders_user_market_request_unique").on(o.userId, o.marketId, o.requestId),

    index("orders_open_asks_idx")
      .on(o.marketId, o.outcome, o.limitPriceCents.asc(), o.sequence.asc())
      .where(sql`${o.status} = 'OPEN' AND ${o.side} = 'SELL'`),
    index("orders_open_bids_idx")
      .on(o.marketId, o.outcome, o.limitPriceCents.desc(), o.sequence.asc())
      .where(sql`${o.status} = 'OPEN' AND ${o.side} = 'BUY'`),
    index("orders_users_status_idx").on(o.userId, o.status),
  ],
)

export const fills = pgTable(
  "fills",
  {
    id: id(),

    marketId: uuid("market_id")
      .references(() => markets.id, { onDelete: "restrict" })
      .notNull(),

    makerOrderId: uuid("maker_order_id").notNull(),
    takerOrderId: uuid("taker_order_id").notNull(),

    ledgerTransactionId: uuid("ledger_transaction_id").notNull().unique(),

    kind: fillKind("kind").notNull(),
    yesPriceCents: integer("yes_price_cents").notNull(),
    quantity: integer("quantity").notNull(),

    createdAt: createdAt(),
  },
  (f) => [
    foreignKey({
      name: "fills_maker_market_fk",
      columns: [f.makerOrderId, f.marketId],
      foreignColumns: [orders.id, orders.marketId],
    }).onDelete("restrict"),
    foreignKey({
      name: "fills_taker_market_fk",
      columns: [f.takerOrderId, f.marketId],
      foreignColumns: [orders.id, orders.marketId],
    }).onDelete("restrict"),
    foreignKey({
      name: "fills_event_market_fk",
      columns: [f.ledgerTransactionId, f.marketId],
      foreignColumns: [ledgerTransactions.id, ledgerTransactions.marketId],
    }).onDelete("restrict"),

    check("fills_distinct_orders", sql`${f.makerOrderId} <> ${f.takerOrderId}`),
    check("fills_valid_price", sql`${f.yesPriceCents} BETWEEN 1 AND 99`),
    check("fills_positive_quantity", sql`${f.quantity} >0 `),

    index("fills_market_time_idx").on(f.marketId, f.createdAt),
    index("fills_maker_idx").on(f.makerOrderId),
    index("fills_taker_idx").on(f.takerOrderId),
  ],
)
