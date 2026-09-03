import './globals.css' // <-- Pastikan baris ini ada di paling atas

export const metadata = {
  title: 'WiraDana',
  description: 'Sistem Manajemen Proyek',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}