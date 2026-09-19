## Booking system
Booking being treated as one atomic operation that updates multiple documents.
- Books tickets
- Deducts wallet balance
- Reduce show tickets
- Records transaction

## Wallet system
- Users can add money into their wallet
- Booking tickets deducts moeny from their wallet
- The transaction is recorded

## Transaction system
- Every transaction is recoded
- Users can see their own transactions
- Admins can view all the transactions

The above features are implemented using mongoDB transactions and every transaction is atomic.

## Flow-
- City -> Movie -> Date -> Theatre -> Time -> Seats