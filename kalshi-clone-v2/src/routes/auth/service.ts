import { LoginInput, SignupInput } from "./types"
import { db } from "../../db/client"
import { cashAccounts, users } from "../../db/schema"
import { ConflictError, UnauthorizedError } from "../../lib/errors"
import { eq } from "drizzle-orm"

export const signupService = async ({ username, password }: SignupInput) => {
  const normalizedUsername = username.trim().toLowerCase()
  const passwordHash = await Bun.password.hash(password)

  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        username: normalizedUsername,
        passwordHash,
      })
      .onConflictDoNothing({ target: users.username })
      .returning({ id: users.id, username: users.username, role: users.role })

    if (!user) {
      throw new ConflictError("Username is already taken")
    }

    await tx.insert(cashAccounts).values({
      kind: "USER_WALLET",
      userId: user.id,
    })
    return user
  })
}
export const loginService = async ({ username, password }: LoginInput) => {
  const normalizedUsername = username.trim().toLowerCase()

  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.username, normalizedUsername))
    .limit(1)

  if (!user || !(await Bun.password.verify(password, user.passwordHash))) {
    throw new UnauthorizedError("Invalid username or password")
  }

  return { id: user.id }
}
