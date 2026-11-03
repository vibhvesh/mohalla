export class AppError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "AppError"
    this.status = status
  }
}

export function jsonError(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  console.error(error)
  return Response.json({ error: "Something went wrong" }, { status: 500 })
}

export function isRetryableTransaction(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const code = "code" in error ? String(error.code) : ""
  const message = "message" in error ? String(error.message) : ""
  return code === "P2034" || code === "40001" || /could not serialize|serialization failure/i.test(message)
}
