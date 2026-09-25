import { prisma } from "../../lib/prisma";

export async function getCitiesService() {
    return prisma.city.findMany({
        orderBy: {name: "asc"}
    })
}