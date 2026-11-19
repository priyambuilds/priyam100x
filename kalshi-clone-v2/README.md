What is an exchange actually exchanging?
- A YES contract
- A NO contract
A contract is a claim on a future payout. It's not cash nor an order.

In our clone (its simplified from the acutual Kalshi API):
- Every winning contract pays 100.
- Contract quantities are whole numbers.
- Trading prices range from 1 - 99.
- All contracts are backed by cash.
- Users can sell only the contracts they own

If a person buys 10 YES contracts at 60. And NO wins, they loose thier 600. And win 400 if YES wins.
But they can also sell for a profit before the result. If hte person sells 10 at 700 they profit 100.

The exchange's job is to cordinate these purchases and sales, preserve ownership and cash, and eventually distribute the promised payouts.

  The market price comes from the orders people submit. A price of 60 is often interpreted as roughly 60% implied probability.

---
Where Do the first contracts come from?
- One YES and one NO always pay a combined 100 under our binary resolution rules: Either YES pays 100 and NO pays 0, or vise versa.
- This lets us create a fully backed pair 100 cash = 1 YES + 1 NO
- This operation is called `SPLIT`.

SPLIT: User pays 100¢ ($1.00) per pair → Escrow receives the cash, User receives 1 YES contract + 1 NO contract.

Lets say A bought 5 yes and 5 no contracts for 500. The money goes from her acc -> market escrow. Person has not made a profit by splitting. A has exchanged 500¢ for claims whose combined payout is 500¢.

Now say B buys 5 YES contracts at 60 from A.
- B pays alice 300.
- A transfers five YES to B.
- A keeps 5 NO contracts.

This trade moved existing ownership, it created no new contracts and required no additional escrow.
If YES wins, B gets 500 in escrow. A's NO contracts expire worthless.

The reverse of `SPLIT` is `MERGE` 
MERGE: User surrenders 1 YES + 1 NO contract → User receives 100¢ ($1.00) cash from Escrow.

For our app a central invariant is: 
- Total YES held by users = total NO held by users = outstanding pairs
- Escrow cash in cents = outstanding pairs * 100

This is a system-wide totals for one market. individual users do not need to hold equal amounts of YES and NO.

---
An order is a request; a fill is something that actually happened.

Suppose B says: "Buy upto 10 YES contracts at most 60 each".
That is a limit order.
It doesnt mean B  has bought anything yet. His order is just sitting on the order book waiting to be filled.

Lets say the order book looks liek this:
| YES sellers | Quantity |
|---|---:|
| Asking 55¢ | 4 |
| Asking 58¢ | 3 |
| Asking 65¢ | 8 |

B's order executes as follows:
- Buy 4 at 55
- Buy 3 at 58
- Stop because 65 exceeds his 60 limit.
- Leave the remaining three contracts requested at 60 in the book.
- B gets 7 contracts and pays 4 × 55 + 3 × 58 = 394¢
- His order created 2 fills because it traded against 2 resting orders.

| Term | Meaning |
|---|---|
| Bid | A price someone offers to buy at |
| Ask | A price someone offers to sell at |
| Maker | The order already waiting in the book |
| Taker | The incoming order that executes against it |
| Fill | A completed execution between two orders |
| Spread | Best ask minus best bid |
| Depth | Quantity available at each price |

For this project, the matching should use price priority, then acceptance order at the same price (FIFO).
Ex: the cheapest elegible seller executes first; two sellers at the same price execute in the order that the excahnge accepted them.

---
Reservations:
When B submits an order we must prevent him from spending the same money somewhere else.
Taking the previous example: "
- Buy upto 10 YES contracts at most 60 each".
- B gets 7 contracts and pays 4 × 55 + 3 × 58 = 394¢

600 is the maximum amount we set aside for B's order. 10 * 60 = 600 reserved.
Following what happens to that reservation:
- Fist B gets filled for 4 contracts at 55 each. We reserved 4*60 = 240 for those 4 contracts.
- But it actually cost 4*55 = 220.
- So that 220 now has 2 destinations:
  - 220 gets spent and goes to the seller.
  - 20 becomes available again.
- Next B gets filled for 3 * 58 = 174. While we reserved 3 * 60 = 180.
- 174 gets spent and goes to the seller and 6 becomes available again.
- The remaining of B's 3 contracts sit in the order book as an open order.
- We must keep 3 * 60 = 180 locked in case a seller arrives later.

Now we can account for the original 600:
| What happened to the reserved money? | Amount |
|---|---:|
| Paid to sellers for seven contracts | 220 + 174 = **394¢** |
| Still locked to buy the remaining three | 3 × 60 = **180¢** |
| No longer needed because the first seven were cheaper | 20 + 6 = **26¢** |
| **Total** | **600¢** |

The 26¢ is Bob’s own money that we reserved but didn’t need to spend.
Releasing a reservation does not add money to his balance. It reduces locked, making more of the existing balance available.

To connect this to your balance and locked fields, suppose Bob started with 1,000¢:
| Stage | `balance` — cash Bob still owns | `locked` — cash reserved for the order | `available = balance − locked` |
|---|---:|---:|---:|
| Before placing the order | 1,000¢ | 0¢ | 1,000¢ |
| After reserving 600¢ | 1,000¢ | 600¢ | 400¢ |
| After buying seven contracts | 606¢ | 180¢ | 426¢ |

His final balance is 606¢ because he spent 394¢.

Of that 606¢, 180¢ is still reserved, leaving 426¢ available. That available amount is the 400¢ he never reserved, plus the 26¢ he reserved but didn’t need.

SELL orders reserve contracts instead of cash. If A owns 10 YES and has already reserved eight for a sell order, only 2 remain available to sell or merge.

This gives us another invariant:
For ordinary user accounts, 0 <= locked <= balance

The hard part is preserving this when requests overlap.
If B has 1000 available in his wallet and simultaneously submits two orders in different markets, each requiring 800. Both requests could read the same balance and decide that enough money exists.

A lock on each market does not solve that: Both markets share Bob's wallet.

That's why we must learn account locking or atomic conditional updates as well as market locking. 

---
YES and NO matching can be done in 2 ways:
| Incoming order | Resting order | Result |
|---|---|---|
| BUY YES | SELL YES | Transfer existing YES |
| BUY YES | BUY NO | Create a newly backed pair |

For the second path, suppose:
- A has a resting BUY NO at 45.
- B sumits BUY YES at 60 limit.

A contributes 45. B need to contribute only 55 to fund the 100 pair.
The result becomes:
- A pays 45 and revceived 1 NO.
- B pays 55 and receives 1 YES.
- Escrow receives 100.
- Outstanding pairs increase by one.

This relationship also explains why a NO bid at 45 implies a potential YES purchase price of 55.

This is a corresponding complementary sale mechanism:
- Someone sells an existing YES.
- Someone else sells an existing NO.
- The system removes the pair and releases 100 from escrow, divided between the sellers according to the execution rules.
---
Why retries need an identity:
Alice requests a 500¢ deposit.
The server commits it.
The response gets lost.
Alice retries.

The server cannot infer whether the second request means:
- “Please try that same deposit again.”
- “Please make another deposit of the same amount.”
We solve this by giving each intended deposit a requestId.

{
  "requestId": "deposit-alice-001",
  "amountCents": 500
}

The rules will be:
| Request | Result |
|---|---|
| New request ID | Record and credit the deposit |
| Same request ID, same amount | Return the existing deposit |
| Same request ID, different amount | Reject with `409 Conflict` |

A second intentional deposit must use a new request ID.

  There are three important decisions here.

We create the entry before incrementing the balance.

If its request ID already exists, the unique constraint rejects the insert. The transaction does not credit another deposit.

If two identical requests arrive together, the database constraint still decides which insert succeeds. A preliminary “does it exist?” check would not provide that guarantee.

We use increment, rather than reading and replacing the balance.
We handle the duplicate after the transaction has failed.

---
SPLIT code:
Notice:
- Alice’s lockedCents does not increase. This is an immediate purchase of a pair, not a resting order.
- Only available cash can fund the split.
- No other trader is required.
- Nobody earns a profit from the split itself.
All of these changes must commit together.

A transaction and a lock solve different problems

A transaction gives us:
Either all changes commit, or none do.

But consider two requests, each attempting to spend Alice’s last 300¢. If they both read the balance before either updates it, both could decide that enough cash exists.

For this operation, we’ll lock the wallet row before checking available cash.

The second request waits. After the first commits, the second reads the updated balance and makes its decision using that value.

We’ll also lock the market row so operations changing its lifecycle and collateral can follow a consistent order.

We’ll use PostgreSQL’s FOR NO KEY UPDATE. It protects the row against concurrent updates while allowing foreign-key checks that only need to reference its ID. Locks are released when the transaction ends. 

There are a few new details worth understanding.

Why create the history entry first?

Its unique request ID claims the operation. If this is a retry of a committed request, the insert fails and we return the existing result.
The entry is still inside the transaction. If the market is closed or funds are insufficient, it rolls back too. There is no completed split entry left behind.

Why use upsert for positions?
It means:
- If this position does not exist, create it.
- If it exists, add to its quantity.

--- 
MERGE code:
Only available contracts can be merged.

Suppose Alice owns five YES contracts, but four are reserved for a SELL order:
- quantity             = 5
- lockedQuantity = 4
- available            = 1

Even if she owns five NO contracts, she can merge only one pair.
Otherwise, we would destroy contracts already promised to a potential buyer.

The order is deliberate:
Claim request ID
    ↓
Lock market
    ↓
Lock wallet
    ↓
Lock positions in a consistent order
    ↓
Validate current state
    ↓
Reduce contracts and escrow
    ↓
Credit cash
    ↓
Commit

--- 
Fill and Orders
We reserve the asset and create the order in one transaction. The market and asset locks have different jobs. The market lock serializes order acceptance for that market, including two submissions with the same request ID. The wallet lock protects shared cash across markets. For a SELL, we lock the position being reserved. We always take the market lock first, as in SPLIT and MERGE.

Notice where the retry lookup happens. A duplicate request waits for the first transaction to release the market lock, then its next query sees the committed order. It returns that order before touching any reservation, even if the market closed in the meantime. If creating the order fails after the reservation update, the transaction rolls back that update too.

| Check | Expected result |
|---|---|
| Submit the BUY | `201`, one `OPEN` order with 10 remaining, wallet still owns 1,000¢ with 600¢ locked |
| Repeat the identical request | `200`, same order ID, still 600¢ locked |
| Submit another identical BUY with a new request ID | `400`, because only 400¢ is available |
| Using a separate user, split three pairs, then place a SELL for two YES | YES quantity stays 3, YES locked quantity becomes 2, NO remains untouched |
| Try to merge two pairs with that second user | `400`, because only one YES is available to merge |