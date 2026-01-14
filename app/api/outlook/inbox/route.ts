import { type NextRequest, NextResponse } from "next/server"

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface EmailMessage {
  id: string
  subject: string
  from: {
    emailAddress: {
      address: string
      name: string
    }
  }
  bodyPreview: string
  receivedDateTime: string
}

interface InboxResponse {
  value: EmailMessage[]
}

export async function POST(request: NextRequest) {
  try {
    const { refreshToken, clientId, folder = "inbox" } = await request.json()

    console.log("[v0] API called with clientId:", clientId)
    console.log("[v0] Refresh token length:", refreshToken?.length)
    console.log("[v0] Fetching folder:", folder)

    if (!refreshToken || !clientId) {
      console.log("[v0] Missing parameters")
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // 获取访问令牌
    console.log("[v0] Requesting access token...")

    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: "https://graph.microsoft.com/.default",
      }),
    })

    console.log("[v0] Token response status:", tokenResponse.status)

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("[v0] Token error:", errorText)
      return NextResponse.json({ error: "Failed to get access token", details: errorText }, { status: 401 })
    }

    const tokenData: TokenResponse = await tokenResponse.json()
    const accessToken = tokenData.access_token

    console.log("[v0] Access token obtained, length:", accessToken?.length)

    const folderPath = folder === "inbox" ? "inbox" : "junkemail"
    const endpoint = `https://graph.microsoft.com/v1.0/me/mailFolders/${folderPath}/messages?$top=50&$orderby=receivedDateTime DESC`

    console.log("[v0] Fetching from endpoint:", endpoint)

    let inboxResponse
    let retryCount = 0
    const maxRetries = 3

    while (retryCount <= maxRetries) {
      inboxResponse = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      console.log("[v0] Inbox response status:", inboxResponse.status)

      if (inboxResponse.status === 503 && retryCount < maxRetries) {
        console.log("[v0] Got 503, retrying...", retryCount + 1)
        retryCount++
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
        continue
      }

      break
    }

    if (!inboxResponse.ok) {
      const errorText = await inboxResponse.text()
      console.error("[v0] Inbox error:", errorText)
      if (inboxResponse.status === 503) {
        return NextResponse.json({ messages: [] })
      }
      return NextResponse.json({ error: "Failed to fetch inbox", details: errorText }, { status: 500 })
    }

    const inboxData: InboxResponse = await inboxResponse.json()

    console.log("[v0] Messages found:", inboxData.value?.length || 0)

    const messages = inboxData.value.map((message) => ({
      id: message.id,
      subject: message.subject || "(无主题)",
      from: message.from?.emailAddress?.address || "未知发件人",
      bodyPreview: message.bodyPreview || "",
      receivedDateTime: message.receivedDateTime,
    }))

    console.log("[v0] Returning messages:", messages.length)

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
