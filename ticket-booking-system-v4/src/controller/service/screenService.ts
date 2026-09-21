import { prisma } from "../../prisma/index.ts"

export async function createScreenService(theatreId: string, name: string) {
    return prisma.screen.create({
        data: {
            name,
            theatreId
        }
    })
}

export async function createSeatsService(screenId: string, seatNumber: number[]) {
    return prisma.seats.createMany({
        data: seatNumber.map((number) => ({
            number: number,
            screenId
        }))
    })
}

export async function getScreensBytheatreIdService(theatreId: string) {
    return prisma.screen.findMany({
        where: {
            theatreId
        },
        include: {
            seats: true
        },
        orderBy: {
            name: "asc"
        }
    })
}