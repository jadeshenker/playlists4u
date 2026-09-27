import Link from "next/link"
import SiteHeader from "@/components/site-header"
import GoHomeShortcut from "@/components/go-home-shortcut"

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />
      <div className="flex flex-1 items-center justify-center">
        <p className="pr-2">playlist not found :&#40;</p>
        <GoHomeShortcut />
      </div>
    </main>
  )
}
