import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/projects/', '/bva/', '/reports/', '/company-profile/', '/login', '/register', '/api/'], // Menyembunyikan halaman internal dashboard demi privasi data
    },
    sitemap: 'https://wiradana-one.vercel.app/sitemap.xml',
  }
}