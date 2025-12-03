import { Buffer } from 'buffer'
import { setup } from '@workspace/wallet-standard'

// Polyfill Buffer for browser
globalThis.Buffer = Buffer

setup()
