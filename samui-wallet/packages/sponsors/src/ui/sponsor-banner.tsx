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

const CACHE_KEY = 'sponsors_cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function SponsorBanner() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        // Check cache first
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const { data, timestamp } = JSON.parse(cached)
          const age = Date.now() - timestamp

          // Use cache if less than 5 minutes old
          if (age < CACHE_DURATION) {
            setSponsors(data)
            return
          }
        }

        // Fetch from backend if cache miss or stale
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
        const response = await fetch(`${backendUrl}/api/sponsors/with-metadata`)
        if (!response.ok) return

        const data = await response.json()
        const validSponsors = data.sponsors.filter(
          (s: Sponsor) => s.metadata?.name && s.metadata.logoUrl,
        )

        // Update state and cache
        setSponsors(validSponsors)
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: validSponsors,
            timestamp: Date.now(),
          }),
        )
      } catch (error) {
        console.error('Failed to fetch sponsors:', error)
      }
    }

    fetchSponsors()
    const fetchInterval = setInterval(fetchSponsors, 5 * 60 * 1000) // Check every 5 minutes

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
      className="flex items-center space-x-3 px-4 py-3 bg-secondary/50 hover:bg-secondary/70 transition-colors border-b border-border"
      href={currentSponsor.metadata?.website || '#'}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className="text-sm text-muted-foreground">⚡ Gas Sponsored By:</span>
      {currentSponsor.metadata?.logoUrl && (
        <img
          alt={currentSponsor.metadata.name}
          className="h-6 w-6 rounded-full object-cover"
          src={currentSponsor.metadata.logoUrl}
        />
      )}
      <span className="text-sm font-semibold truncate">{currentSponsor.metadata?.name}</span>
    </a>
  )
}

