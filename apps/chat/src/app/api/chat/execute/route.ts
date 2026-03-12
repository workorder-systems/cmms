import { getDbClientForUser } from "@/lib/chat-db"
import {
  executeAction,
  type ExecuteAction,
} from "@/app/api/chat/tools"

export const maxDuration = 15

/** POST body: run a previously confirmed action on behalf of the user. */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const accessToken = body.accessToken as string | undefined
    const refreshToken = (body.refreshToken as string | undefined) ?? null
    const tenantId = body.tenantId as string | undefined
    const action = body.action as ExecuteAction | undefined
    const params = (body.params as Record<string, unknown>) ?? {}

    if (
      !accessToken ||
      !tenantId ||
      !action ||
      typeof params !== "object"
    ) {
      return new Response(
        JSON.stringify({
          error: "Missing accessToken, tenantId, action, or params.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const db = await getDbClientForUser(accessToken, refreshToken, tenantId)
    const result = await executeAction(db, action, params, tenantId)

    if (result.ok) {
      return new Response(JSON.stringify({ data: result.data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }
    const errorMessage =
      result.error?.includes("Invalid status transition from completed to completed")
        ? "This work order is already completed. Ask to add or update cause and resolution for it."
        : result.error
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Chat execute API error:", error)
    const message = error instanceof Error ? error.message : "Failed to execute action."
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
