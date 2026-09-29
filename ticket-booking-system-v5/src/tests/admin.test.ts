import { describe, it, expect, beforeAll } from "bun:test"
import { api, getAdminToken, getUserToken } from "./helpers/auth"

describe("Admin Routes", () => {
    let userToken: string
    let adminToken: string

    let cityId: string
    let theatreId: string
    let screenId: string
    let movieId: string

    const cityName = `Delhi_${Date.now()}`
    const theatreName = `PVR_${Date.now()}`
    const movieName = `Avengers ${Date.now()}`

    beforeAll(async () => {
        userToken = await getUserToken()
        adminToken = await getAdminToken()
    })

    describe("Security & Auth", () => {
        it("should reject completely unauthenticated requests", async () => {
            const { status } = await api.admin.city.post({ name: "TestCity" })
            expect(status).toBe(401)
        })
        it("should reject requests from regular users", async () => {
            const { status } = await api.admin.city.post(
                { name: "TestCity" },
                {
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                    },
                },
            )
            expect(status).toBe(403)
        })
    })

    describe("City routes", () => {
        it("Success: Should create a new City", async () => {
            const { status, data } = await api.admin.city.post(
                { name: cityName },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(201)
            expect(data?.success).toBe(true)
            cityId = data!.data.id
        })
        it("Validation: Should reject empty city names", async () => {
            const { status } = await api.admin.city.post(
                { name: "" },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(422)
        })
        it("Conflict: Should reject duplicate city names", async () => {
            const { status } = await api.admin.city.post(
                { name: cityName },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(409)
        })
    })
    describe("Theatre routes", () => {
        it("Success: Should create a new Theatre inside a valid city", async () => {
            const { status, data } = await api.admin.city({ cityId }).theatre.post(
                { name: theatreName },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(201)
            expect(data?.success).toBe(true)
            theatreId = data!.data.id
        })
        it("Bad Request: Should reject theatre creation if the city does not exist", async () => {
            const fakeId = crypto.randomUUID()
            const { status } = await api.admin.city({ cityId: fakeId }).theatre.post(
                { name: "PVR cinema" },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(400)
        })
        it("Validation: Should reject empty theatre names", async () => {
            const { status } = await api.admin.city({ cityId }).theatre.post(
                { name: "" },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(422)
        })
        it("Conflict: Should reject duplicate theatre names inside the same city", async () => {
            const { status } = await api.admin.city({ cityId }).theatre.post(
                { name: theatreName },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(409)
        })
    })
    describe("Screen routes", () => {
        it("Success: Should create a new Screen inside a valid theatre", async () => {
            const { status, data } = await api.admin.theatre({ theatreId }).screen.post(
                { numbers: [1] },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(201)
            screenId = data!.data[0].id
        })
        it("Validation: Should reject empty, zero or negative screen numbers", async () => {
            const { status } = await api.admin.theatre({ theatreId }).screen.post(
                { numbers: [0, -1] },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(422)
        })
        it("Bad Request: Should reject screen creation if the theatre does not exist", async () => {
            const fakeId = crypto.randomUUID()
            const { status } = await api.admin.theatre({ theatreId: fakeId }).screen.post(
                { numbers: [2, 3] },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(400)
        })
        it("Conflict: Should reject duplicate screen numbers inside the same theatre", async () => {
            const { status } = await api.admin.theatre({ theatreId }).screen.post(
                { numbers: [1] },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(409)
        })
    })
    describe("Seats routes", () => {
        it("Success: Should create a new Screen inside a valid screen", async () => {
            const { status } = await api.admin.screen({ screenId }).seat.post(
                { numbers: [15] },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(201)
        })
        it("Bad Request: Should reject seat creation if the screen does not exist", async () => {
            const fakeId = crypto.randomUUID()
            const { status } = await api.admin.screen({ screenId: fakeId }).seat.post(
                { numbers: [2, 3] },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(400)
        })
        it("Validation: Should reject empty, or negative seat numbers", async () => {
            const { status } = await api.admin.screen({ screenId }).seat.post(
                { numbers: [0, -1] },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(422)
        })
        it("Conflict: Should reject duplicate seat numbers inside the same screen", async () => {
            const { status } = await api.admin.screen({ screenId }).seat.post(
                { numbers: [15] },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(409)
        })
    })
    describe("Movie routes", () => {
        it("Success: Should create a new Movie", async () => {
            const { status, data } = await api.admin.movie.post(
                { name: movieName },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(201)
            movieId = data!.data.id
        })
        it("Validation: Should reject empty movie names", async () => {
            const { status, data } = await api.admin.movie.post(
                { name: "" },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(422)
        })
        it("Conflict: Should reject duplicate movie names", async () => {
            const { status, data } = await api.admin.movie.post(
                { name: movieName },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(201)
            movieId = data!.data.id
        })
    })
    describe("ShowTime routes", () => {
        it("Success: Should create a new ShowTime", async () => {
            const { status } = await api.admin.showtime.post(
                {
                    screenId,
                    movieId,
                    startsAt: "2031-01-01T10:00:00.000Z",
                    endsAt: "2031-01-01T12:00:00.000Z",
                    priceCents: 1500,
                },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(201)
        })
        it("Validation: Should reject negative ticket prices", async () => {
            const { status } = await api.admin.showtime.post(
                {
                    screenId,
                    movieId,
                    startsAt: "2031-01-01T10:00:00.000Z",
                    endsAt: "2031-01-01T12:00:00.000Z",
                    priceCents: -500,
                },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(422)
        })
        it("Bad Request: Should reject Showtime creation for invalid times", async () => {
            const { status } = await api.admin.showtime.post(
                {
                    screenId,
                    movieId,
                    startsAt: "not-a-real-date",
                    endsAt: new Date().toISOString(),
                    priceCents: 1500,
                },
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            )
            expect(status).toBe(422)
        })
        it("Conflict: Should reject Showtime creation for overlapping screen times", async () => {
            const startsAt = "2032-01-01T10:00:00.000Z"
            const endsAt = "2032-01-01T12:00:00.000Z"

            const headers = { Authorization: `Bearer ${adminToken}` }
            const initialShowtime = await api.admin.showtime.post(
                {
                    screenId,
                    movieId,
                    startsAt,
                    endsAt,
                    priceCents: 1500,
                },
                { headers },
            )
            expect(initialShowtime.status).toBe(201)

            const { status } = await api.admin.showtime.post(
                {
                    screenId,
                    movieId,
                    startsAt: "2032-01-01T11:00:00.000Z",
                    endsAt: "2032-01-01T13:00:00.000Z",
                    priceCents: 1500,
                },
                { headers },
            )
            expect(status).toBe(409)
        })
    })
})
