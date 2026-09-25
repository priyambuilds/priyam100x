import { prisma } from "../../lib/prisma";
import type { UserRole } from "../../../generated/prisma/enums";

export async function signupUser(
    username: string,
    email: string,
    password: string,
    role: UserRole
) {
    const passwordHash = await Bun.password.hash(password);
    return prisma.user.create({
        data: {
            username,
            email,
            password: passwordHash,
            role
        },
        select: {
            id: true,
            username: true,
            email: true,
            role: true
        }
    })
}
   export async function verifyUser (
    username: string,
    password: string,
   ) {
       const user = await prisma.user.findFirst({
           where: {username},
       })
       if (!user) {
           return null;
       }
       const isValid = await Bun.password.verify(password, user.password);
       if (!isValid) {
           return null
       }
       return user;
   }