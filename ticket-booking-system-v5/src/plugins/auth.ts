import { Elysia } from "elysia"
import { jwtSetup } from "./jwt"
import {bearer} from "@elysia/bearer";
import { UnauthorizedError } from "../lib/errors";
export const authPlugin = new Elysia()
    .use(jwtSetup)
    .use(bearer())
    .resolve({ as: 'scoped' }, async({jwt, bearer}) => {
        if (!bearer) {
            throw new UnauthorizedError("Missing or malformed token")
        }
        const decoded = await jwt.verify(bearer);
        if (!decoded || !decoded.userId || !decoded.role) {
            throw new UnauthorizedError("Invalid or expired token")
        }
        return {
            userId: decoded.userId as string,
            role: decoded.role as string
        }
    })
    
