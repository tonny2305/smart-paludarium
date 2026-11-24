import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/providers/AuthProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Smart Paludarium — Control Center',
  description: 'Pusat pemantauan privat untuk ekosistem paludarium pintar. Telemetri ESP32, sensor DHT22, dan cuaca dalam satu dashboard.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f0f4ef' },
    { media: '(prefers-color-scheme: dark)', color: '#08120f' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
