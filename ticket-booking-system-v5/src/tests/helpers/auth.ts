import {treaty} from "@elysia/eden";
import { app } from "../../app";

export const api = treaty(app).api.v5

function uniqueUser(prefix = "user") {
    const ts = Date.now()
    return {
        username: `${prefix}${ts}`,
        email: `${prefix}${ts}@test.com`,
        password: "Password1234!",
        role: "USER" as const
    }
}

function uniqueAdmin(prefix = "admin") {
    const ts = Date.now()
    return {
        username: `${prefix}${ts}`,
        email: `${prefix}${ts}@test.com`,
        password: "Password1234!",
        role: "ADMIN" as const
    }
}

export async function getUserToken(prefix?: string):Promise<string> {
    const creds = uniqueUser(prefix)
    await api.auth.signup.post(creds)
    const { data } = await api.auth.signin.post({
        username: creds.username,
        password: creds.password
    })
    return data!.data.token
}
export async function getAdminToken(prefix?: string):Promise<string> {
    const creds = uniqueAdmin(prefix)
    await api.auth.signup.post(creds)
    const { data } = await api.auth.signin.post({
        username: creds.username,
        password: creds.password
    })  
    return data!.data.token as string
}