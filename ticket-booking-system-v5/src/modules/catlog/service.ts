import { prisma } from "../../lib/prisma"

export async function getCitiesService() {
    return prisma.city.findMany({ orderBy: { name: "asc" } })
}
export async function getTheatresByCityService(cityId: string) {
    await prisma.city.findUniqueOrThrow({ where: { id: cityId } })
    return prisma.theatre.findMany({ where: { cityId }, orderBy: { name: "asc" } })
}
export async function getShowtimesByCityService(cityId: string) {
    await prisma.city.findUniqueOrThrow({ where: { id: cityId } })
    return prisma.showTimes.findMany({
        where: { screen: { theatre: { cityId } } },
        include: { movie: true, screen: { include: { theatre: true } } },
        orderBy: { startsAt: "asc" },
    })
}
export async function getShowtimesByTheatreService(theatreId: string) {
    await prisma.theatre.findUniqueOrThrow({ where: { id: theatreId } })
    return prisma.showTimes.findMany({
        where: { screen: { theatreId } },
        include: { movie: true, screen: true },
        orderBy: { startsAt: "asc" },
    })
}
export async function getShowtimeService(showtimeId: string) {
    return prisma.showTimes.findUniqueOrThrow({
        where: { id: showtimeId },
        include: {
            movie: true,
            screen: {
                include: {
                    theatre: true,
                    seats: {
                        orderBy: { number: "asc" },
                        include: { bookedSeats: { where: { showtimeId }, select: { id: true } } },
                    },
                },
            },
        },
    })
}
export async function getScreensByTheatreService(theatreId: string) {
    await prisma.theatre.findUniqueOrThrow({ where: { id: theatreId } })
    return prisma.screen.findMany({ where: { theatreId }, orderBy: { number: "asc" } })
}
export async function getSeatsByScreenService(screenId: string) {
    await prisma.screen.findUniqueOrThrow({ where: { id: screenId } })
    return prisma.seats.findMany({ where: { screenId }, orderBy: { number: "asc" } })
}
