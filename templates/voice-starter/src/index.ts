// Voice Agent - Cloudflare Worker
// VAPI webhook handler

interface Env {
  VAPI_WEBHOOK_SECRET: string
  // Add other environment variables here
}

interface VAPIMessage {
  type: string
  call?: {
    id: string
    customer?: {
      number: string
    }
  }
  message?: {
    role: string
    content: string
    toolCalls?: Array<{
      id: string
      function: {
        name: string
        arguments: string
      }
    }>
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // VAPI webhook
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleWebhook(request, env)
    }

    return new Response('Not Found', { status: 404 })
  },
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  try {
    // Verify webhook secret (optional but recommended)
    const secret = request.headers.get('x-vapi-secret')
    if (env.VAPI_WEBHOOK_SECRET && secret !== env.VAPI_WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body: VAPIMessage = await request.json()

    // Handle different message types
    switch (body.type) {
      case 'assistant-request':
        return handleAssistantRequest(body)

      case 'tool-calls':
        return handleToolCalls(body, env)

      case 'end-of-call-report':
        return handleEndOfCall(body)

      default:
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
    }
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

function handleAssistantRequest(body: VAPIMessage): Response {
  // Dynamic assistant configuration
  return new Response(
    JSON.stringify({
      assistant: {
        // Override assistant settings dynamically if needed
      },
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}

async function handleToolCalls(body: VAPIMessage, env: Env): Promise<Response> {
  const toolCalls = body.message?.toolCalls || []
  const results = []

  for (const toolCall of toolCalls) {
    const { name, arguments: argsString } = toolCall.function
    const args = JSON.parse(argsString)

    let result: unknown

    switch (name) {
      case 'example_tool':
        result = await exampleTool(args)
        break
      // Add more tools here
      default:
        result = { error: `Unknown tool: ${name}` }
    }

    results.push({
      toolCallId: toolCall.id,
      result: JSON.stringify(result),
    })
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

function handleEndOfCall(body: VAPIMessage): Response {
  // Log call end, save transcript, etc.
  console.log('Call ended:', body.call?.id)

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

// Example tool implementation
async function exampleTool(args: { query: string }): Promise<unknown> {
  // Implement your tool logic here
  return {
    response: `Processed query: ${args.query}`,
  }
}
