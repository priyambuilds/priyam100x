import { ConflictError, UnauthorizedError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";

export const signupService = async (username: string, password: string) => {
  const normalized = username.trim().toLowerCase();

  const exisiting = await prisma.user.findUnique({
    where: {username}
  })
  if (exisiting) {
    throw new ConflictError("username already exists");
  }

  const hashedPassword = await Bun.password.hash(password);
  
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        username: normalized,
        password: hashedPassword
      }
    })

    await tx.account.create({
      data: {
        userId: newUser.id,
        balance: 0
      }
    })
    return newUser;
  })
  return {id: user.id, username: user.username};
}
export const signinService = async (username: string, password: string) => {
  const normalized = username.trim().toLowerCase();

  const exisiting = await prisma.user.findUnique({
    where: {username}
  })
  if (!exisiting) {
    throw new UnauthorizedError("Invalid creds");
  }

  const valid = await Bun.password.verify(password, exisiting.password);

  if (!valid) {
    throw new UnauthorizedError("Invalid creds");
  }
  return {userId: exisiting.id};
}
