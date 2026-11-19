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
      // nested write
      // Prisma creates the user and related wallet inside one transaction
      // If wallet creation fails, the user creation is rolled back as well
      // no need to write an additional $transaction around this particular operation
      wallet: {
        create: {}
      }
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
