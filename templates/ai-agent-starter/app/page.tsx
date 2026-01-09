import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          AI Agent
        </h1>
        <p className="text-muted-foreground max-w-md">
          Your AI-powered assistant. Start a conversation to get help.
        </p>
        <Link
          href="/chat"
          className="inline-flex items-center justify-center rounded-md bg-brand px-8 py-3 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          Start Chat
        </Link>
      </div>
    </main>
  )
}
