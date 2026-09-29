import { BadRequestError, ConflictError } from "../../lib/errors"
import { prisma } from "../../lib/prisma"

export const createCityService = async (name: string) => {
    return prisma.city.create({
        data: {
            name,
        },
    })
}
export const createTheatreService = async (cityId: string, name: string) => {
    return prisma.theatre.create({
        data: {
            cityId,
            name,
        },
    })
}
export const createScreenService = async (theatreId: string, numbers: number[]) => {
    const data = numbers.map((num) => ({ theatreId, number: num }))
    return await prisma.screen.createManyAndReturn({ data })
}

export const createSeatService = async (screenId: string, numbers: number[]) => {
    const data = numbers.map((num) => ({ screenId, number: num }))
    return await prisma.seats.createManyAndReturn({ data })
}
export const createMovieService = async (name: string) => {
    return prisma.movie.create({ data: { name } })
}
export const createShowtimeService = async (
    screenId: string,
    movieId: string,
    startsAt: Date,
    endsAt: Date,
    priceCents: number,
) => {
    if (startsAt >= endsAt) {
        throw new BadRequestError("Showtime endsAt must be after startsAt")
    }

    const overlapping = await prisma.showTimes.findFirst({
        where: {
            screenId,
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
        },
    })

    if (overlapping) {
        throw new ConflictError("Overlap error: this screen already has a showTime scheduled during this time")
    }

    return prisma.showTimes.create({
        data: {
            screenId,
            movieId,
            startsAt,
            endsAt,
            priceCents,
        },
    })
}
