import { prisma } from "../../prisma/index.ts"

export async function createTheatreService(
    cityId: string,
    name: string
) {
    return prisma.theatre.create({
        data: {
            name,
            cityId
        }
    })
}

export async function getTheatreService(cityId: string) {
    return prisma.theatre.findMany({
        where: {
            cityId
        },
        include: {
            city: true,
            screens: {
                include: {
                    seats: true
                }
            }
        }
    })
}

export async function getTheatreByIdService(theatreId: string) {
    return prisma.theatre.findUnique({
        where: {
            id: theatreId
        },
        include: {
            city: true,
            screens: {
                include: {
                    seats: true
                }
            }
        }
    })
}