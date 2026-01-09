import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Platform Dashboard
        </h1>
        <p className="text-muted-foreground max-w-md">
          Internal platform for managing projects, clients, and tasks.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  )
}
