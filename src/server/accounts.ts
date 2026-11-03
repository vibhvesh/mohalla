import { compare, hash } from "bcryptjs"
import { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import type { PublicUser } from "@/lib/types"
import { parseLogin, parseSignup } from "@/lib/validators"

export function toPublicUser(user: {
  id: string
  name: string
  email: string | null
  phone: string | null
}): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
  }
}

export async function signup(input: unknown) {
  const data = parseSignup(input)
  try {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash: await hash(data.password, 10),
      },
    })
    return user
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("An account with that email or mobile number already exists", 409)
    }
    throw error
  }
}

export async function login(input: unknown) {
  const data = parseLogin(input)
  const user = data.email
    ? await prisma.user.findUnique({ where: { email: data.email } })
    : await prisma.user.findUnique({ where: { phone: data.phone! } })
  const passwordOk = user ? await compare(data.password, user.passwordHash) : false
  if (!user || !passwordOk) {
    throw new AppError("Incorrect email, mobile number, or password", 401)
  }
  return user
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } })
}
