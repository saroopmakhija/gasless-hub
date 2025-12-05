import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { UiLoader } from '@workspace/ui/components/ui-loader'
import { useAccountActive } from '@workspace/db-react/use-account-active'
import { PublicKey } from '@solana/web3.js'
import { useEffect, useState } from 'react'
import { SponsorRegisterModal } from './sponsor-register-modal'
import { BaseSponsorDepositModal } from './base-sponsor-deposit-modal'

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

const SPONSORS_CACHE_KEY = 'sponsors_list_cache'
const SPONSORS_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

export function SponsorsFeatureIndex() {
  const activeAccount = useAccountActive()
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showBaseDepositModal, setShowBaseDepositModal] = useState(false)

  const publicKey = activeAccount?.publicKey ? new PublicKey(activeAccount.publicKey) : null

  const fetchSponsors = async (forceRefresh = false) => {
    try {
      setLoading(true)

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = localStorage.getItem(SPONSORS_CACHE_KEY)
        if (cached) {
          const { data, timestamp } = JSON.parse(cached)
          const age = Date.now() - timestamp

          // Use cache if less than 2 minutes old
          if (age < SPONSORS_CACHE_DURATION) {
            console.log('Loading sponsors from cache')
            setSponsors(data)
            setLoading(false)
            return
          }
        }
      }

      // Fetch from backend
      console.log('Fetching sponsors from backend...')
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

      // Update cache
      localStorage.setItem(
        SPONSORS_CACHE_KEY,
        JSON.stringify({
          data: processedSponsors,
          timestamp: Date.now(),
        }),
      )
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
                      Sponsoring gas fees
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardHeader>
          <CardTitle>Sponsor Gas Fees</CardTitle>
          <CardDescription>Choose how you want to contribute to the fee pool</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border bg-card space-y-3">
              <h3 className="font-semibold">Deposit from Solana</h3>
              <p className="text-sm text-muted-foreground">
                Register as a sponsor and deposit USDC directly from your Solana wallet
              </p>
              <Button onClick={() => setShowRegisterModal(true)} className="w-full">
                Solana Deposit
              </Button>
            </div>
            <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/5 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Deposit from Base</h3>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-500 text-white">
                  CROSS-CHAIN
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Bridge USDC from Base using Circle's CCTP - perfect for Base sponsors
              </p>
              <Button
                onClick={() => setShowBaseDepositModal(true)}
                className="w-full"
                variant="default"
              >
                Base Deposit (CCTP)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <SponsorRegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={() => {
          setShowRegisterModal(false)
          fetchSponsors(true) // Force refresh after registration
        }}
        publicKey={publicKey}
        accountId={activeAccount?.id}
      />

      <BaseSponsorDepositModal
        isOpen={showBaseDepositModal}
        onClose={() => setShowBaseDepositModal(false)}
        onSuccess={() => {
          setShowBaseDepositModal(false)
          fetchSponsors(true) // Force refresh after deposit
        }}
        feePoolAddress="CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU"
      />
    </div>
  )
}

