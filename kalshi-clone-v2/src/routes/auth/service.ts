import { AccountType } from "../../../generated/prisma/enums"
import { ConflictError, UnauthorizedError } from "../../lib/errors"
import { prisma } from "../../lib/prisma"

const normalized = (name: string) => name.trim().toLowerCase()

export async function signupService(username: string, password: string) {
  const normalizedUsername = normalized(username)

  const existing = await prisma.user.findUnique({
    where: { username: normalizedUsername },
  })

  if (existing) {
    throw new ConflictError("Username already exists")
  }

  const hashedPassword = await Bun.password.hash(password)

  const user = await prisma.user.create({
    data: {
      username: normalizedUsername,
      password: hashedPassword,
      accounts: {
        create: {
          type: AccountType.USER_WALLET,
          balance: 0,
          locked: 0,
        },
      },
    },
    select: {
      id: true,
      username: true,
      createdAt: true,
    },
  })
  return user
}

export async function signinService(username: string, password: string) {
  const normalizedUsername = normalized(username)

  const user = await prisma.user.findUnique({
    where: { username: normalizedUsername },
  })

  if (!user) {
    throw new UnauthorizedError("Invalid Credentials")
  }

  const valid = await Bun.password.verify(password, user.password)

  if (!valid) {
    throw new UnauthorizedError("Invalid creds")
  }

  return {
    userId: user.id,
    username: user.username,
  }
}
