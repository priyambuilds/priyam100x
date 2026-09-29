import { describe, it, expect } from "bun:test"
import { api } from "./helpers/auth"

describe("Auth Routes", () => {
    const timestamp = Date.now()
    const uniqueUser = {
        username: `authuser${timestamp}`,
        email: `authuser${timestamp}@test.com`,
        password: "Password123!",
        role: "USER" as const,
    }

    describe("/signup", () => {
        it("Success: Should successfully register a new user", async () => {
            const { status, data } = await api.auth.signup.post(uniqueUser)
            expect(status).toBe(201)
            expect(data?.success).toBe(true)
        expect(data?.data).toHaveProperty("id")
            expect(data?.data.username).toBe(uniqueUser.username)
        })
        it("Validation: Should reject empty, or invalid email or username", async () => {
            const { status } = await api.auth.signup.post({
                ...uniqueUser,
                username: `bademail_${timestamp}`,
                email: "not-an-email",
            })
            expect(status).toBe(422)
        })
        it("Validation: Should reject missing, empty or invalid passwords", async () => {
            const { status } = await api.auth.signup.post({
                username: `nopass_${timestamp}`,
                email: `nopass_${timestamp}@test.com`,
                role: "USER",
            } as any)
            expect(status).toBe(422)
        })
        it("Bad Request: Should reject seat creation if the screen does not exist", async () => {})
        it("Conflict: Should reject registration if email already exist", async () => {
            const { status } = await api.auth.signup.post({
                ...uniqueUser,
                username: `different_username_${timestamp}`,
            })
            expect(status).toBe(409)
        })
        it("Conflict: Should reject registration if username already exist", async () => {
            const { status } = await api.auth.signup.post({
                ...uniqueUser,
                email: `different_email_${timestamp}@test.com`
            });
            expect(status).toBe(409);
        })
    })
    describe("/signin", () => {
        it("Success: Should successfully login and return a JWT token", async () => {
             const { status, data } = await api.auth.signin.post({
                username: uniqueUser.username,
                password: uniqueUser.password
            });
            expect(status).toBe(201);
            expect(data?.success).toBe(true);
            expect(data?.data).toHaveProperty("token");
        })
        it("Bad request: Should reject login if user does not exist", async () => {
                        const { status, data } = await api.auth.signin.post({
                username: "nonexistent_user_999",
                password: "Password123!"
            });
            expect([400, 401]).toContain(status);
            expect(data?.success ?? false).toBe(false);
        })
        it("Bad request: Should reject login with, incorrect password", async () => {
            const { status, data } = await api.auth.signin.post({
                username: uniqueUser.username,
                password: "WrongPassword123!"
            });
            expect([400, 401]).toContain(status);
            expect(data?.success ?? false).toBe(false);
        })
    })
})
