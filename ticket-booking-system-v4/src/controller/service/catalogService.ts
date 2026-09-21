import { prisma } from "../../prisma/index.ts";

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

export async function getMoviesByCityService(cityId: string) {
    return prisma.movie.findMany({
        where: {
            showtimes: {
                some: {
                    startsAt: { gte: new Date() },
                    screen: {
                        theatre: {
                            cityId
                        }
                    }
                }
            }
        },
        orderBy: {
            title: "asc"
        }
    })
}
