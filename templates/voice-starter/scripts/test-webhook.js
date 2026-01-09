#!/usr/bin/env node

// Test webhook locally
// Usage: node scripts/test-webhook.js

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:8787/webhook'

async function testWebhook() {
  console.log(`Testing webhook at: ${WEBHOOK_URL}`)

  // Test tool call
  const testPayload = {
    type: 'tool-calls',
    call: {
      id: 'test-call-123',
    },
    message: {
      role: 'assistant',
      toolCalls: [
        {
          id: 'tool-call-1',
          function: {
            name: 'example_tool',
            arguments: JSON.stringify({ query: 'test query' }),
          },
        },
      ],
    },
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vapi-secret': process.env.VAPI_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify(testPayload),
    })

    const result = await response.json()
    console.log('Response:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('Error:', error.message)
  }
}

testWebhook()
