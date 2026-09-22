import {prisma} from "../../prisma/index.ts"

export async function createBookingService(
  userId: string,
  showtimeId: string,
  seatNumbers: number[],
) {
  return prisma.$transaction(async (tx) => {
    const showTime = await tx.showTime.findUnique({
      where: {
        id: showtimeId,
      },
      select: {
        id: true,
        screenId: true,
        priceCents: true
      }
    })
    if (!showTime) {
      throw new Error("Showtime not found")
    }

    const seats = await tx.seats.findMany({
      where: {
        screenId: showTime.screenId,
        number: {
          in: seatNumbers,
        }
      }
    })
    if (seats.length !== seatNumbers.length) {
      throw new Error("One or more seats do not exist")
    }

    const alreadyBooked = await tx.bookingSeat.findMany({
      where: {
        showtimeId,
        screenId: showTime.screenId,
        seatNumber: {
          in: seatNumbers
        }
      }
    })

    if (alreadyBooked.length > 0) {
      throw new Error("One or more seats are already booked")
    }

    const totalCents = showTime.priceCents * seatNumbers.length

    const wallet = await tx.wallet.findUnique({
      where: {
        userId
      }
    })

    if (!wallet || wallet.balanceCents < totalCents) {
      throw new Error("Insufficient wallet balance")
    }

    const updateWallet = await tx.wallet.update({
      where: {
        userId,
      },
      data: {
        balanceCents: {
          decrement: totalCents
        }
      }
    })

    const booking = await tx.booking.create({
      data: {
        userId,
        showtimeId,
        totalCents,
        status: "CONFIRMED",
        seats: {
          create: seatNumbers.map((seatNumber) => ({
            showtimeId,
            screenId: showTime.screenId,
            seatNumber
          }))
        }
      },
      include: {
        seats: true,
        showtime: true
      }
    })

    await tx.transaction.create({
      data: {
        userId,
        bookingId: booking.id,
        type: "BOOKING",
        amountCents: totalCents,
        balanceBeforeCents: wallet.balanceCents,
        balanceAfterCents: updateWallet.balanceCents,
        status: "COMPLETED"
      }
    })
    return booking
  })
}

export async function getMyBookingsService(userId: string) {
  return prisma.booking.findMany({
    where: {
      userId,
    },
    include: {
      showtime: {
        include: {
          movie: true,
          screen: {
            include: {
              theatre: true
            }
          }
        }
      },
      seats: true
    },
    orderBy: {
      createdAt: "desc"
    }
  })
}