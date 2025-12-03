import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FeePool } from "../target/types/fee_pool";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createInitializeMintInstruction, MINT_SIZE } from "@solana/spl-token";
import * as fs from "fs";

describe("initialize-v2", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.FeePool as Program<FeePool>;
  const wallet = provider.wallet as anchor.Wallet;

  it("Initializes fee pool V2", async () => {
    console.log("\n🚀 Initializing Fee Pool V2\n");
    console.log("==================================================\n");

    console.log("1️⃣  Program ID:", program.programId.toBase58());
    console.log("   Wallet:", wallet.publicKey.toBase58());

    // Derive PDAs
    const [feePoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_pool")],
      program.programId
    );

    console.log("\n2️⃣  Checking if fee pool exists...");
    try {
      const feePoolAccount = await program.account.feePool.fetch(feePoolPda);
      console.log("   ⚠️  Fee pool already initialized!");
      console.log("   Fee Pool PDA:", feePoolPda.toBase58());
      console.log("   Authority:", feePoolAccount.authority.toBase58());
      console.log("   USDC Mint:", feePoolAccount.usdcMint.toBase58());
      console.log("   USDC Vault:", feePoolAccount.usdcVault.toBase58());
      console.log("   Total Deposited:", feePoolAccount.totalDeposited.toString());
      return;
    } catch (e) {
      console.log("   Fee pool not initialized yet");
    }

    console.log("\n3️⃣  Creating test USDC mint...");
    const usdcMint = Keypair.generate();
    console.log("   USDC Mint:", usdcMint.publicKey.toBase58());

    // Create USDC mint (6 decimals like real USDC)
    const mintRent = await provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);
    const createMintIx = SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: usdcMint.publicKey,
      lamports: mintRent,
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
    });

    const initMintIx = createInitializeMintInstruction(
      usdcMint.publicKey,
      6, // decimals
      wallet.publicKey, // mint authority
      null // freeze authority
    );

    const tx1 = new anchor.web3.Transaction().add(createMintIx, initMintIx);
    await provider.sendAndConfirm(tx1, [usdcMint]);
    console.log("   ✅ USDC mint created");

    // Derive USDC vault PDA
    const [usdcVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("usdc_vault"), usdcMint.publicKey.toBuffer()],
      program.programId
    );

    console.log("\n4️⃣  Initializing fee pool...");
    console.log("   Fee Pool PDA:", feePoolPda.toBase58());
    console.log("   USDC Vault PDA:", usdcVaultPda.toBase58());

    const tx = await program.methods
      .initializeFeePool()
      .accounts({
        feePool: feePoolPda,
        authority: wallet.publicKey,
        usdcMint: usdcMint.publicKey,
        usdcVault: usdcVaultPda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("   ✅ Fee pool initialized!");
    console.log("   Transaction:", tx);

    console.log("\n5️⃣  Verifying initialization...");
    const feePoolData = await program.account.feePool.fetch(feePoolPda);
    console.log("   Authority:", feePoolData.authority.toBase58());
    console.log("   USDC Mint:", feePoolData.usdcMint.toBase58());
    console.log("   USDC Vault:", feePoolData.usdcVault.toBase58());
    console.log("   Total Deposited:", feePoolData.totalDeposited.toString());
    console.log("   Total Withdrawn:", feePoolData.totalWithdrawn.toString());
    console.log("   Total Sponsors:", feePoolData.totalSponsors.toString());

    // Save addresses
    console.log("\n6️⃣  Saving addresses...");
    const envContent = `# Fee Pool V2 Configuration
FEE_POOL_PROGRAM_ID=${program.programId.toBase58()}
FEE_POOL_PDA=${feePoolPda.toBase58()}
USDC_MINT=${usdcMint.publicKey.toBase58()}
USDC_VAULT_PDA=${usdcVaultPda.toBase58()}
AUTHORITY=${wallet.publicKey.toBase58()}
`;

    fs.writeFileSync("../../backend/.env.feepool", envContent.trim());
    console.log("   ✅ Saved to backend/.env.feepool");

    console.log("\n==================================================");
    console.log("✅ Fee Pool V2 initialized successfully!\n");
  });
});

