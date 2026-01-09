# [Project Name] - Voice Agent

## Overview
VAPI voice assistant built for [Client Name].

## Stack
- **Platform**: VAPI (Voice AI)
- **Runtime**: Cloudflare Workers (Deno)
- **STT**: Gladia Solaria
- **LLM**: Google Gemini 2.0 Flash
- **TTS**: Cartesia

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Fill in API keys

# Run local development
npm run dev
# Server starts at http://localhost:8787

# Deploy to Cloudflare
npm run deploy
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Local dev server (Wrangler) |
| `npm run deploy` | Deploy to Cloudflare |
| `npm run secret` | Set environment secret |
| `npm run test` | Test webhook locally |
| `npm run deploy:vapi` | Deploy VAPI configuration |

## Project Structure

```
├── src/
│   └── index.ts           # Cloudflare Worker entry point
├── vapi-config/
│   ├── tools.json         # VAPI tool definitions
│   └── assistant.json     # VAPI assistant configuration
├── scripts/
│   ├── deploy-vapi.js     # Deploy VAPI config
│   ├── test-webhook.js    # Test webhook locally
│   └── debug-vapi.js      # Debug VAPI calls
├── wrangler.toml          # Cloudflare config
└── .env.example           # Environment template
```

## Environment Variables

Set via `wrangler secret put`:

```bash
VAPI_API_KEY=           # VAPI API key
VAPI_WEBHOOK_SECRET=    # Webhook verification secret
```

## VAPI Tools

Tools defined in `vapi-config/tools.json`:
- [List your tools here]

## Webhook Endpoint

The worker handles VAPI webhooks at:
- **Development**: `http://localhost:8787/webhook`
- **Production**: `https://[worker-name].[account].workers.dev/webhook`

## Deployment

1. Deploy Cloudflare Worker:
   ```bash
   npm run deploy
   ```

2. Update VAPI assistant with webhook URL:
   ```bash
   npm run deploy:vapi
   ```

3. Test via VAPI dashboard or phone call

## Client
- **Name**: [Client Name]
- **Phone**: [Phone number if applicable]
- **Language**: [Primary language]
- **Persona**: [Voice personality description]
