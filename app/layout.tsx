import type { Metadata } from "next"
import { DM_Mono } from "next/font/google"
import Footer from "@/components/footer"
import "./globals.css"

const dmMono = DM_Mono({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
})

export const metadata: Metadata = {
  title: "ilovemusic",
  description: "spotify + are.na playground",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={dmMono.variable}>
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-purple-50 font-mono text-violet-700">
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  )
}
