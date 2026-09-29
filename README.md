# Assignment 3:
**Project link:** [https://priyam100x.vercel.app/](https://priyam100x.vercel.app/)
- **Figma Design Link:** https://www.figma.com/design/3HILbBgh4KIuoJXvkik4Do/Untitled?node-id=14-802&t=9mNZRjwooIgAWNiv-1
- Took this assignment as an opportunity to re-learn React.
- This project uses the js logic written in part 1, and React for the frontend and UI rendering.
- React + Tailwind + Shadcn UI library have been used in this project.

# Movie booking app backend in ElysiaJs
## Project structure

```text
.
├── app.ts             //defines the routes, the plugins, the logic
├── index.ts           //registes the app (app.listen(3000))
├── config/
│   └── env.           //ENV helper (extracts the ENV variable for easy access)
├── lib/
│   ├── error          //Custom error handler
	│   ├── prisma     //Prisma client export helper
│   └── response       //Response schema helper
├── modules/
│   ├── admin/
│   │   ├── route
│   │   ├── schema
│   │   └── service
│   ├── auth/
│   │   ├── route
│   │   ├── schema
│   │   └── service
│   ├── booking/
│   │   ├── route
│   │   ├── schema
│   │   └── service
│   ├── catlog/
│   │   ├── route
│   │   ├── schema
│   │   └── service
│   ├── transaction/
│   │   ├── route
│   │   ├── schema
│   │   └── service
│   └── wallet/
│       ├── route
│       ├── schema
│       └── service
├── plugins/
│   ├── admin          //Verifies if a ther is admin (for admin protected routes)
│   ├── auth           //Authenticates the user and assigns a JWT token.
│   ├── errorHandler   //Handles the errors, and custom errors throughout the app
│   ├── jwt            //for JWT verification
│   └── openAPI        //for OpenAPI specs
└── tests/
    ├── admin.test.ts
    ├── auth.test.ts
    ├── booking.test.ts
    ├── catlog.test.ts
    ├── transaction.test.ts
    ├── wallet.test.ts
    └── helpers/
        └── auth      //Helper, registers the user/admin and returns JWT token

```

## Getting started

### Prerequisites

- Bun
- ElysiaJs

### Configuration

Create a `.env` file in the project root with these variables:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
SECRET="your-jwt-secret"
PORT=3000
```

`DATABASE_URL` and `SECRET` are required. `PORT` is optional and defaults to `3000`.

### Install and run

```sh
bun install
bunx prisma migrate dev
bunx prisma generate
bun run dev
```

The OpenAPI documentation is available at `http://localhost:3000/api/v5/openapi` when using the default port.

## Bun tests

We are using a seperate app.ts and index.ts. It is the best practice. Because of one reason:

It helps in testing.

In our tests file we `import {app} from "app"`

if our `app.listen(3000)` was inside the app.ts, the moment our test file imported app, it would actually try to start the web server and bind to port 3000.

This allows our tests to safely import app from app.ts and send requests directly into its memory using `app.handle()` without ever starting a real, physical HTTP server on a port. This makes our tests fast.

Run the tests with:

```sh
bun test
```

Before running the suite, the test command resets the database configured by `DATABASE_URL` in `.env` with `prisma db push --force-reset`. This deletes all data in that database.

### Test cases

#### Admin

- **/ POST admin**
  - `Unauthorized`
    - 401 Should reject completely unauthenticated requests
    - 403 Should reject requests from regular users
  - `/City`
    - 201 Should create a new city
    - 422 Validation: Should reject empty city names
    - 409 Conflict: Should reject duplicate city names
  - `/Theatre`
    - 201 Should create a theatre in a valid city
    - 422 Validation: Should reject empty theatre names
    - 400 Should reject theatre creation if the city does not exist
    - 409 Conflict: Should reject duplicate theatre names in the same city
  - `/Screen`
    - 201 Should create a screen in a valid theatre
    - 422 Validation: Should reject empty, negative or 0 screen numbers
    - 400 Should reject screen creation if the theatre does not exist
    - 409 Conflict: Should reject duplicate screen numbers in the same theatre
  - `/Seat`
    - 201 Should create a seat in a valid screen
    - 422 Validation: Should reject empty, negative or 0 seat numbers
    - 400 Should reject seat creation if the screen does not exist
    - 409 Conflict: Should reject duplicate seat numbers in the same screen
  - `/Movie`
    - 201 Should create a movie
    - 422 Validation: Should reject empty names
    - 409 Conflict: Should reject duplicate movie names
  - `/ShowTime`
    - 201 Should create a showTime
    - 422 Validation: Should reject invalid dates for showtimes
    - 422 Validation: Should reject negative ticket prices
    - 409 Conflict: Should reject startsAt >= endsAt

#### Auth

- **/ POST auth**
  - `/signup`:
    - 201 Should successfully register a new user
    - 422 Validation: Should invalid email formats or missing passwords
    - 409 Conflict: Should reject registration if email or username already exists
  - /`signin:`
    - 201 Should successfully login and return a JWT token
    - 400, 401 Unautohorized: Should reject login with incorrect password
    - 400, 401 Unauthorized: Should reject login for a user that does not exist

#### Booking

- **/booking**
  - `/ POST `
    - 201, Should successfully book tickets
    - 401, Should reject unauthenticated requests
    - 422, Validation: Should reject empty seat numbers
    - 400, 422 Conflict: Should reject booking if the seatNumbers array contains duplicate numbers
    - 400, 422 Conflict: Should reject duplicate bookings of a seat
    - 400, 404 Conflict: Shoudl reject booking if seats do not exist on the screen
    - 400, Conflict: Should reject if user's wallet balance is less than the total ticket price
    - 409, Conflict: Should reject booking if the seat is booked by someone else
  - `/ GET`
    - 201, Should return the booked shows by the user
    - 400, 404, Should return not found if there's no bookings done by that user yet

#### Transactions

- **/ GET transactions**
  - `/`
    - 401, Should reject unauthenticated requests
    - 200, Should allow the users to view their own transactions
  - `/all`
    - 401, Should reject requests from standard USER accounts
    - 200, Shoudl allow ADMIN accounts to retreive all transactions

#### Wallet

- **/ wallet**
  - `/ GET`
    - 401, Security
    - 200, Should return user's wallet balance
  - `/ POST toptup`
    - 200, Should topup user's wallet balance
    - 422 Validation: Should reject invalid topup amount

#### Catalog

- **/ GET catlog**
  - `/catalog/cities`
    - 200, Should return a list of cities publicly
  - `/catalog/cities/:cityId/theatres`
    - 200, Should return theatres for a valid city
    - 200, Should return an empty array if the city has no theatres
    - 422, Validation: Should reject an invalid city ID
    - 404, Should reject a city ID that does not exist
  - `/catalog/theatres/:theatreId/showtimes`
    - 200, Should return showtimes for a valid theatre
    - 422, Validation: Should reject an invalid theatre ID
    - 404, Should reject a theatre ID that does not exist
  - `/catalog/showtimes/:showtimeId`
    - 200, Should return detailed information for a valid showtime
    - 422, Validation: Should reject an invalid showtime ID
    - 404, Should reject a showtime ID that does not exist

## Learning

### The flow of how I made this

1. Analyze bookMyShow
2. Map the user journey
3. Figure out the nouns
4. Create the necessary tables
5. Figure out the relations
6. Figure out the database constraints
7. Decide the project structure
8. Create the files
9. Initialize the app
10. Create the skeleton of the app
11. Create the plugins
12. Create helper functions
13. Define the core routes
14. Write the core service logic
15. Start the server and test the OpenAPI specs
16. Map out all the test cases for the routes
17. Write bun:tests for all the routes

### ElysiaJs Concepts I learnt

1. Routes - Static, Dynamic, Wildcards
2. Handler and Context
3. Method chaining
4. Order of code
5. Handler
6. Plugin
7. Lifecycle
8. Encapsulation
9. Deduplication
10. Dependency
11. Validation
12. The Context & Dependency Injection
13. Eden Treaty (E2E Type Safety)

### Elysia Plugins used

- JWT
- Bearer
- CORS
- Eden

### OpenAPI tests

Openapi specs response documentation are generated thanks to : `response: { 201: res(AuthUserResponseSchema) }`

we defined `res` in our lib/response.ts

```ts
export const res = <T extends TSchema>(schema: T) =>
  t.Object({
    success: t.Literal(true),
    message: t.Optional(t.String()),
    data: schema,
  });
```

This is a response enveloupe that tells Elysia that every response object should look like this else throw an error.

define the response schema:

```ts
export const AuthUserResponseSchema = t.Object({
  id: t.String(),
  username: t.String(),
  email: t.String(),
  role: t.Union([t.Literal("USER"), t.Literal("ADMIN")]),
});
```

then pass `response: { 201: res(AuthUserResponseSchema) }` to the res function.

Now Elysia knows what the response will look like, TypeBox generates a JSON schema and we see what the respone would look like the swagger page.

## Database Concepts

### 1. Relations and uniqueness constraints

You record data in database. Constraints define which facts the database will accept.

A good database schema makes invalid states impossible to store, instead of relying on every piece of application code to remember every rule.

### 2. Association/Junction table

We have two tables:

- `Booking`: one row per customer booking.
- `Seats`: one row per seat in a screen.

A booking can include several seats, and a seat can appear in different bookings over time. That is a **many-to-many relationship**

| bookingId | seatId  |
| --------- | ------- |
| booking-A | seat-12 |
| booking-A | seat-13 |

That third table is called an **association table** or **junction table**.

### 3. Foreign Keys

A foreign key says that a value in one table must refer to an existing row in another table.

For example:

```prisma
user User @relation(fields: [userId], references: [id])
```

This says: `Booking.userId` must match an actual `User.id`. The database will reject a booking that refers to a nonexistent user. That rule is a **foreign-key constraint**.

A foreign key prevents dangling references.

### 4. Referential integrity

**Referential integrity** means relationships stored in the database remain valid. For example:

- a booking refers to a real showtime;
- a booked seat refers to a real seat;
- a booked seat cannot claim that a seat is on a screen it does not belong to.

### 5. Composite Foreign keys

A foreign key usually checks one column. A **composite foreign key** checks multiple columns together.

```prisma
seat Seats @relation(fields: [seatId, screenId], references: [id, screenId])
```

Read this as:

> The pair `(BookedSeats.seatId, BookedSeats.screenId)` must match the pair `(Seats.id, Seats.screenId)` on one existing seat row.

Suppose the `Seats` table contains:

| id      | screenId |
| ------- | -------- |
| seat-12 | screen-2 |

Then `(seat-12, screen-2)` is valid, but `(seat-12, screen-9)` is not. The latter tries to claim that seat 12 belongs to screen 9.

The other relations enforce similar consistency:

```prisma
booking Booking   @relation(fields: [bookingId, showtimeId], references: [id, showtimeId])
seat    Seats     @relation(fields: [seatId, screenId], references: [id, screenId])
showTime ShowTimes @relation(fields: [showtimeId, screenId], references: [id, screenId])
```

Together, they enforce a chain:

> This booking is for this showtime; this seat belongs to this screen; this showtime uses this screen.

The referenced pairs need to be unique. That’s why the parent models declare pairs such as:

```prisma
@@unique([id, screenId])
```

So a booked-seat row can’t accidentally combine a booking from one showtime with a seat from an incompatible screen.

## Prisma Concepts

### 1. `@@unique` and `@relation`

1. `@@unique(...)` : says, no two rows in this table should have the same values in these columns
2. `@relation(fields: ..., references: ...)` : Says, these values must match a real row in another table. It creates a foreign key constraint

For example, this relation (this is an example of a foreign key constraint):

```prisma
seat Seats @relation(
  fields: [seatId, screenId],
  references: [id, screenId]
)
```

Means: **this pair must point to a real, matching seat row.**

requires the pair `(seatId, screenId)` in `BookedSeats` to match an actual pair in `Seats`. It prevents a row from claiming that a seat belongs to the wrong screen.

`BookedSeats` is an **association (junction) table**:

The extra `showtimeId` and `screenId` columns let the database enforce that all three records agree with each other.

```prisma
@@unique([showtimeId, seatId])
```

Means: **don’t allow two rows in `BookedSeats` for the same showtime and seat.**

### Our specific BookedSeats example

`BookedSeats` is an **association (junction) table**: each row connects one booking to one seat. It represents “this particular seat is included in this particular booking.” The extra `showtimeId` and `screenId` columns let the database enforce that all three records agree with each other.

Think of a row like this:

| bookingId | seatId  | showtimeId | screenId |
| --------- | ------- | ---------- | -------- |
| booking-7 | seat-12 | show-3     | screen-2 |

Each relation checks part of that statement:

```prisma
booking  Booking   @relation(fields: [bookingId, showtimeId], references: [id, showtimeId])
seat     Seats     @relation(fields: [seatId, screenId], references: [id, screenId])
showTime ShowTimes @relation(fields: [showtimeId, screenId], references: [id, screenId])
```

The `bookingId` must identify a booking whose `showtimeId` is `show-3`. So you can’t attach a seat from one showtime to a booking for another.

The `seatId` must identify a seat that actually belongs to `screen-2`.

The `showtimeId` must identify a showtime that actually takes place on `screen-2`.

Together, those composite foreign keys enforce: **the booking is for this showtime, and this seat is on the screen used by that showtime**. This is called **referential integrity** using **composite foreign keys**. The corresponding `@@unique([id, ...])` declarations on `Booking`, `Seats`, and `ShowTimes` make those referenced pairs unique, as required for composite references.

The `@@unique([showtimeId, seatId])` on `BookedSeats` adds another rule: the same seat can’t be booked twice for the same showtime, though it can be booked for a different showtime.

### How to design one from first principles

For each new relationship, work through these questions:

1. **What does one row represent?** For `BookedSeats`: one seat included in one booking.
2. **How many of each thing can be related?** One booking can contain multiple seats. A seat can be used in different showtimes. That suggests an association table.
3. **What must be true for every row?** The booking exists, the seat exists, the showtime exists, and the screen matches the seat and showtime.
4. **What must never happen twice?** A seat must not be reserved twice for one showtime. That suggests `@@unique([showtimeId, seatId])`.
5. **Which rules should the database enforce?** Put existence and consistency rules in foreign keys, and duplicate-prevention rules in unique constraints. Application checks can provide friendly errors, but database constraints are the final protection.
