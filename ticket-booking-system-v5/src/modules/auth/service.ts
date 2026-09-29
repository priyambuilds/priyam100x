import { UserRole } from "../../../generated/prisma/enums";
import { UnauthorizedError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";

export const  signupUserService = async (
    username: string,
    email: string,
    password: string,
    role: UserRole
) => {
    const hashedPassword = await Bun.password.hash(password);
    return prisma.user.create({
        data: {
            username,
            email,
            password: hashedPassword,
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
export const signinUserService = async (
    username: string,
    password: string,
) => {
    const user = await prisma.user.findFirst({
        where: { username },
        select: {
            id: true,
            role: true,
            password: true
        }
    })
    if (!user) {
        throw new UnauthorizedError("Invalid credentials")
    }
    const isValid = await Bun.password.verify(password, user.password)
    if (!isValid) {
        throw new UnauthorizedError("Invalid credentials")
    }
    return user
}
