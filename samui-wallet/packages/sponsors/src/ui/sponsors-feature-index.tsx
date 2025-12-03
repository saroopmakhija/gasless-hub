import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { UiLoader } from '@workspace/ui/components/ui-loader'
import { useAccountActive } from '@workspace/db-react/use-account-active'
import { PublicKey } from '@solana/web3.js'
import { useEffect, useState } from 'react'
import { SponsorRegisterModal } from './sponsor-register-modal'

interface SponsorMetadata {
  name: string
  website: string
  logoUrl: string
}

interface Sponsor {
  address: string
  totalContributed: number
  transactionsSponsored: number
  lastDepositTime: number
  metadata?: SponsorMetadata
}

export function SponsorsFeatureIndex() {
  const activeAccount = useAccountActive()
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRegisterModal, setShowRegisterModal] = useState(false)

  const publicKey = activeAccount?.publicKey ? new PublicKey(activeAccount.publicKey) : null

  const fetchSponsors = async () => {
    try {
      setLoading(true)
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/api/sponsors/with-metadata`)

      if (!response.ok) {
        throw new Error('Failed to fetch sponsors')
      }

      const data = await response.json()
      const processedSponsors = data.sponsors
        .map((s: any) => ({
          ...s,
          totalContributed: s.totalContributed / 1_000_000, // Convert from base units
        }))
        .sort((a: Sponsor, b: Sponsor) => b.totalContributed - a.totalContributed)

      setSponsors(processedSponsors)
    } catch (err: any) {
      console.error('Failed to fetch sponsors:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSponsors()
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <UiLoader />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gas Sponsors</h1>
        <p className="text-muted-foreground">Companies funding gasless transactions for users</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sponsor Leaderboard</CardTitle>
          <CardDescription>Top contributors funding gas fees</CardDescription>
        </CardHeader>
        <CardContent>
          {sponsors.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No sponsors yet</p>
          ) : (
            <div className="space-y-3">
              {sponsors.map((sponsor, index) => (
                <div
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors"
                  key={sponsor.address}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl font-bold text-muted-foreground">#{index + 1}</span>
                    {sponsor.metadata?.logoUrl && (
                      <img
                        alt={sponsor.metadata.name}
                        className="h-10 w-10 rounded-full object-cover"
                        src={sponsor.metadata.logoUrl}
                      />
                    )}
                    <div>
                      <h3 className="font-semibold">
                        {sponsor.metadata?.name || `${sponsor.address.slice(0, 8)}...`}
                      </h3>
                      {sponsor.metadata?.website && (
                        <a
                          className="text-sm text-blue-500 hover:underline"
                          href={sponsor.metadata.website}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {sponsor.metadata.website}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{sponsor.totalContributed.toLocaleString()} USDC</p>
                    <p className="text-sm text-muted-foreground">
                      {sponsor.transactionsSponsored} transactions
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center">
        <Button
          onClick={() => setShowRegisterModal(true)}
          size="lg"
        >
          Become a Sponsor
        </Button>
      </div>

      <SponsorRegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={() => {
          setShowRegisterModal(false)
          // Refresh sponsor list
          fetchSponsors()
        }}
        publicKey={publicKey}
        accountId={activeAccount?.id}
      />
    </div>
  )
}

