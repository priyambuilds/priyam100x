import {prisma} from "../../prisma/index.ts"

export async function createCityService(name: string) {
    return prisma.city.create({
        data: {
            name,
        }
    })
}

export async function getCitiesService() {
    return prisma.city.findMany({
        orderBy: {
            name: "asc",
        }
    })
}