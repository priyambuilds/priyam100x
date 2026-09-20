Writing the workflows in plain language

User selects a city.
User sees movies available in that city.
User selects a movie.
User sees dates.
User selects a date.
User sees theatres.
User selects a theatre.
User sees showtimes.
User selects a showtime.
User selects seats.
User books the seats.

Admin creates a city.
Admin creates a theatre inside a city.
Admin creates a screen inside a theatre.
Admin creates seats inside a screen.
Admin creates a movie.
Admin schedules a movie on a screen.

Looking at the important nouns
City
Movie
Date
Theatre
Screen
ShowTime
Seats
User
Wallet
Transaction

Not every noun needs a table of its own. Like date, it can be a property of the ShowTime.

A useful question can be:
Does this item has its own relationships, identity, lifecycle?

Now describing ownership in sentences:
A city has many theatres
A theatre has many screens
A screen has multiple seats
A seat belongs to one screen
A movie has many showTimes
A showTime belongs to one movie
a showTime happens on one screen

Turning this into relationships
City -> Theatre, Theatre -> City
Theatre -> Screen, Screen -> Theatre
Screen -> Seats, Seats -> Screen
Movie -> ShowTime
Screen -> ShowTime

Look for relationships that need their own information. Those relationships often become entities.

ShowTime here is an event involving- movie + screen + startTime + endTime + price

Describe whether something is a reusable definition or a scheduled occurance.

Definition:
Movie
Theatre
Screen
Seats

Scheduled occurance:
Transactions
ShowTime
Booking

Ask what the system must prevent:
Can 2 screens play the same movie in the same theare?
- No there can be different time slots for the same movie

Model the user’s query path

If you cannot express an important query through your relationships, your model is probably missing an entity or relationship.