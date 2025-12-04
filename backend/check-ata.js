const { PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync } = require('@solana/spl-token');

const sponsor = new PublicKey('4EwMZ3btBiv1r7yxTHh9inUQK3nqNGNC5NxdZtmfpQVD');
const usdcMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

const ata = getAssociatedTokenAddressSync(usdcMint, sponsor);
console.log('Sponsor:', sponsor.toBase58());
console.log('USDC Mint:', usdcMint.toBase58());
console.log('Expected ATA:', ata.toBase58());
console.log('Actual account in transaction:', '8EsxGpNFaKQjmmi6cbPJGaRkQGYX5RVwSJYazdcspJEE');
console.log('Match:', ata.toBase58() === '8EsxGpNFaKQjmmi6cbPJGaRkQGYX5RVwSJYazdcspJEE');
