import AboutButton from "@/components/about-button"

export default function SiteHeader() {
  return (
    <div className="flex items-start justify-between border-b border-gray-600 pt-6 pb-3">
      <div className="px-3 md:px-6">
        <p className="font-mono text-sm">
          PLAYLISTS4U
        </p>
      </div>
      <div className="px-3 md:px-6">
        <AboutButton />
      </div>
    </div>
  )
}
