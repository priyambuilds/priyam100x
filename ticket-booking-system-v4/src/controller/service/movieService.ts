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

export async function getMoviesService() {
    return prisma.movie.findMany({
        orderBy: {
            title: "asc"
        }
    })
}

export async function getMoviesByIdService(movieId: string) {
    return prisma.movie.findUnique({
        where: {
            id: movieId
        }
    })
}