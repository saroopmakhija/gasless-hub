import { useEffect, useState } from 'react'

interface SponsorMetadata {
  name: string
  website: string
  logoUrl: string
}

interface Sponsor {
  address: string
  totalContributed: number
  metadata?: SponsorMetadata
}

export function SponsorBanner() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
        const response = await fetch(`${backendUrl}/api/sponsors/with-metadata`)
        if (!response.ok) return

        const data = await response.json()
        const validSponsors = data.sponsors.filter(
          (s: Sponsor) => s.metadata?.name && s.metadata.logoUrl,
        )
        setSponsors(validSponsors)
      } catch (error) {
        console.error('Failed to fetch sponsors:', error)
      }
    }

    fetchSponsors()
    const fetchInterval = setInterval(fetchSponsors, 60000) // Refresh every minute

    return () => clearInterval(fetchInterval)
  }, [])

  useEffect(() => {
    if (sponsors.length === 0) return

    const rotateInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sponsors.length)
    }, 10000) // Rotate every 10 seconds

    return () => clearInterval(rotateInterval)
  }, [sponsors.length])

  const currentSponsor = sponsors[currentIndex]

  if (!currentSponsor) return null

  return (
    <a
      className="flex items-center space-x-2 px-3 py-1.5 bg-secondary/50 hover:bg-secondary/70 transition-colors border-b border-border"
      href={currentSponsor.metadata?.website || '#'}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className="text-xs text-muted-foreground">⚡ Gas Sponsored By:</span>
      {currentSponsor.metadata?.logoUrl && (
        <img
          alt={currentSponsor.metadata.name}
          className="h-4 w-4 rounded-full object-cover"
          src={currentSponsor.metadata.logoUrl}
        />
      )}
      <span className="text-xs font-semibold truncate">{currentSponsor.metadata?.name}</span>
    </a>
  )
}

