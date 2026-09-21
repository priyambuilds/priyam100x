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
  })

}