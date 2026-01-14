import { NextRequest, NextResponse } from 'next/server'

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface MessageBody {
  contentType: string
  content: string
}

interface MessageResponse {
  id: string
  subject: string
  body: MessageBody
}

export async function POST(request: NextRequest) {
  try {
    const { refreshToken, clientId, messageId } = await request.json()

    console.log('[v0] Fetching message:', messageId)

    if (!refreshToken || !clientId || !messageId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // 获取访问令牌
    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          scope: 'https://graph.microsoft.com/.default',
        }),
      }
    )

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[v0] Token error:', errorText)
      return NextResponse.json(
        { error: 'Failed to get access token' },
        { status: 401 }
      )
    }

    const tokenData: TokenResponse = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // 获取完整邮件内容
    const messageResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${messageId}?$select=id,subject,body`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text()
      console.error('[v0] Message error:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch message' },
        { status: 500 }
      )
    }

    const messageData: MessageResponse = await messageResponse.json()

    console.log('[v0] Message body type:', messageData.body.contentType)
    console.log('[v0] Message body length:', messageData.body.content.length)

    return NextResponse.json({
      body: messageData.body.content,
      bodyType: messageData.body.contentType.toLowerCase().includes('html') ? 'html' : 'text'
    })
  } catch (error) {
    console.error('[v0] API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
