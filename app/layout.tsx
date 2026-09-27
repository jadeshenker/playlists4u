import type { Metadata } from "next"
import { DM_Mono } from "next/font/google"
import ToastProvider from "@/components/toast-provider"
import TrackPlayerProvider from "@/components/track-player-provider"
import MiniPlayer from "@/components/mini-player"
import "./globals.css"

const dmMono = DM_Mono({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://www.1-800-i-love-music.com"),
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
      <body className="flex min-h-screen flex-col overflow-x-hidden text-[13px] font-sans">
        <TrackPlayerProvider>
          <ToastProvider>
            <div className="flex flex-1 flex-col">{children}</div>
            <MiniPlayer />
          </ToastProvider>
        </TrackPlayerProvider>
      </body>
    </html>
  )
}
