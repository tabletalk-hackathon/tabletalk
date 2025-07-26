import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TableTalk - Restaurant Reservations',
  description: 'AI-powered restaurant reservation app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          <main className="container mx-auto px-4 py-8 max-w-md">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}