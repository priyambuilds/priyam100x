import { prisma } from "../../prisma/index.ts"

export async function createMovieService(
    title: string,
    description: string,
    durationMin: number
) {
    return prisma.movie.create({
        data: {
            title,
            description,
            durationMin
        }
    })
}

