import { NotFoundError } from "elysia"
import { BookingStatus, TransactionStatus, TransactionType } from "../../../generated/prisma/enums"
import { BadRequestError, ConflictError } from "../../lib/errors"
import { prisma } from "../../lib/prisma"
import { Prisma } from "../../../generated/prisma/client"

export const createBookingService = async (userId: string, showtimeId: string, seatNumbers: number[]) => {
    if (new Set(seatNumbers).size !== seatNumbers.length) {
        throw new BadRequestError("Duplicate seats are not allowed")
    }

    try {
        return await prisma.$transaction(async (tx) => {
            const showTime = await tx.showTimes.findUniqueOrThrow({
                where: { id: showtimeId },
                select: {
                    id: true,
                    screenId: true,
                    priceCents: true,
                },
            })

            const seats = await tx.seats.findMany({
                where: {
                    screenId: showTime.screenId,
                    number: {
                        in: seatNumbers,
                    },
                },
                select: {
                    id: true,
                    number: true,
                },
            })

            if (seats.length !== seatNumbers.length) {
                throw new BadRequestError("One or more seats are invalid")
            }

            const alreadyBooked = await tx.bookedSeats.findFirst({
                where: {
                    showtimeId,
                    seatId: {
                        in: seats.map((s) => s.id),
                    },
                },
            })

            if (alreadyBooked) {
                throw new ConflictError("One or more seats are already booked for this showtime")
            }

            const totalCents = showTime.priceCents * seats.length
            const user = await tx.user.findUniqueOrThrow({
                where: {
                    id: userId,
                },
                select: {
                    walletBalanceCents: true,
                },
            })

            if (user.walletBalanceCents < totalCents) {
                throw new BadRequestError("Insufficinet wallet balance, please topup your wallet")
            }

            const amountBeforeCents = user.walletBalanceCents
            const amountAfterCents = amountBeforeCents - totalCents

            const booking = await tx.booking.create({
                data: {
                    userId,
                    showtimeId,
                    status: BookingStatus.CONFIRMED,
                    totalCents,
                },
            })

            await tx.bookedSeats.createMany({
                data: seats.map((seat) => ({
                    bookingId: booking.id,
                    seatId: seat.id,
                    showtimeId,
                    screenId: showTime.screenId,
                })),
            })

            await tx.user.update({
                where: { id: userId },
                data: {
                    walletBalanceCents: amountAfterCents,
                },
            })

            await tx.transaction.create({
                data: {
                    userId,
                    bookingId: booking.id,
                    type: TransactionType.BOOKING,
                    amountCents: totalCents,
                    amountBeforeCents,
                    amountAfterCents,
                    status: TransactionStatus.SUCCESS,
                },
            })

            return {
                booking,
                seats: seats.map((seat) => seat.number),
            }
        })
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            throw new ConflictError("One or more seats are already booked for this showtime")
        }
        throw err;
    }
}

export async function getBookingsService(userId: string) {
    const bookings = await prisma.booking.findMany({
        where: { userId },
        include: {
            showTime: {
                include: {
                    movie: true,
                    screen: {
                        include: {
                            theatre: true,
                        },
                    },
                },
            },
            bookedSeats: {
                include: {
                    seat: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    })

    if (!bookings) {
        throw new NotFoundError("You dont have any bookings")
    }
    return bookings
}
