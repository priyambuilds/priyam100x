import { jwt } from "@elysia/jwt";
import { ENV } from "../config/env";
export const jwtSetup = jwt({
    name: "jwt",
    secret: ENV.SECRET as string,
    exp: "7d"
})