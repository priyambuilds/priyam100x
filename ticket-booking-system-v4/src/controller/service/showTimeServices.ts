import { prisma } from "../../prisma/index.ts";

export async function createShowtimeService(
    movieId: string,
    screenId: string,
    startsAt: Date,
    endsAt: Date,
    priceCents: number
) {
    
}