import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import { getUserById, toPublicUser } from "@/server/accounts"
import type { PublicUser } from "@/lib/types"

const COOKIE = "mohalla_session"

function secret() {
  const value = process.env.AUTH_SECRET
  if (!value || value.length < 16) {
    throw new Error("AUTH_SECRET must be a random string of at least 16 characters")
  }
  return new TextEncoder().encode(value)
}

export async function signSession(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret())
}

export async function readSessionUserId(token: string | undefined) {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    return typeof payload.sub === "string" ? payload.sub : null
  } catch {
    return null
  }
}

export async function setSessionCookie(userId: string) {
  const jar = await cookies()
  jar.set(COOKIE, await signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function clearSessionCookie() {
  const jar = await cookies()
  jar.delete(COOKIE)
}

export async function currentUser(): Promise<PublicUser | null> {
  const jar = await cookies()
  const userId = await readSessionUserId(jar.get(COOKIE)?.value)
  if (!userId) return null
  const user = await getUserById(userId)
  return user ? toPublicUser(user) : null
}

export async function requireUser(): Promise<PublicUser> {
  const user = await currentUser()
  if (!user) {
    const { AppError } = await import("@/lib/errors")
    throw new AppError("Log in to continue", 401)
  }
  return user
}
