import { prisma } from "../../prisma/index.ts";

export async function createShowtimeService(
    movieId: string,
    screenId: string,
    startsAt: Date,
    endsAt: Date,
    priceCents: number
) {
    const [movie, screen] = await Promise.all([
        prisma.movie.findUnique({
            where: {
                id: movieId
            }
        }),
        prisma.screen.findUnique({
            where: {
                id: screenId
            }
        })
    ])

    if (!movie) {
        throw new Error("Movie not found");
    }
    if (!screen) {
        throw new Error("Screen not found");
    }

    const conflictingShowtime = await prisma.showTime.findFirst({
        where: {
            screenId: screenId,
            startsAt: {
                lt: endsAt
            },
            endsAt: {
                gt: startsAt
            }
        }
    })

    if (conflictingShowtime) {
        throw new Error("Screen already has an overlapping show time")
    }

    return prisma.showTime.create({
        data: {
            movieId,
            screenId,
            startsAt,
            endsAt,
            priceCents
        }
    })
}