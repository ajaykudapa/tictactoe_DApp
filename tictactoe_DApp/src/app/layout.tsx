// app/layout.tsx
import { Inter } from 'next/font/google'
import './globals.css'
import { ClientProvider } from '@/components/providers/ClientProvider'
import Header from '@/components/layout/Header'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientProvider>
          <div className="min-h-screen bg-push-light">
            <Header />
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
          </div>
        </ClientProvider>
      </body>
    </html>
  )
}

// Prevent static generation for the entire app since it requires client-side wallet initialization
export const dynamic = 'force-dynamic'