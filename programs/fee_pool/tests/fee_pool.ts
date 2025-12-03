import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FeePool } from "../target/types/fee_pool";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { assert } from "chai";

describe("fee_pool", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.FeePool as Program<FeePool>;

  let usdcMint: anchor.web3.PublicKey;
  let authority = provider.wallet as anchor.Wallet;
  let sponsor: anchor.web3.Keypair;
  let feePoolPda: anchor.web3.PublicKey;
  let usdcVaultPda: anchor.web3.PublicKey;
  let sponsorRecordPda: anchor.web3.PublicKey;
  let sponsorUsdcAccount: any;
  let authorityUsdcAccount: any;

  before(async () => {
    // Create a sponsor keypair
    sponsor = anchor.web3.Keypair.generate();

    // Airdrop SOL to sponsor
    const sig = await provider.connection.requestAirdrop(
      sponsor.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    // Create USDC mint
    usdcMint = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      6 // USDC has 6 decimals
    );

    console.log("USDC Mint:", usdcMint.toBase58());

    // Create token accounts
    sponsorUsdcAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      usdcMint,
      sponsor.publicKey
    );

    authorityUsdcAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      usdcMint,
      authority.publicKey
    );

    // Mint USDC to sponsor for testing
    await mintTo(
      provider.connection,
      authority.payer,
      usdcMint,
      sponsorUsdcAccount.address,
      authority.payer,
      1_000_000 * 1e6 // 1 million USDC
    );

    console.log("Sponsor USDC Account:", sponsorUsdcAccount.address.toBase58());

    // Derive PDAs
    [feePoolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("fee_pool")],
      program.programId
    );

    [usdcVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("usdc_vault"), usdcMint.toBuffer()],
      program.programId
    );

    [sponsorRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("sponsor_record"), sponsor.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Initializes the fee pool", async () => {
    try {
      const tx = await program.methods
        .initializeFeePool()
        .accounts({
          feePool: feePoolPda,
          usdcVault: usdcVaultPda,
          usdcMint: usdcMint,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      console.log("Initialize tx:", tx);

      // Fetch and verify the fee pool account
      const feePoolAccount = await program.account.feePool.fetch(feePoolPda);

      assert.equal(
        feePoolAccount.authority.toBase58(),
        authority.publicKey.toBase58(),
        "Authority mismatch"
      );
      assert.equal(
        feePoolAccount.usdcMint.toBase58(),
        usdcMint.toBase58(),
        "USDC mint mismatch"
      );
      assert.equal(
        feePoolAccount.totalDeposited.toNumber(),
        0,
        "Total deposited should be 0"
      );
      assert.equal(
        feePoolAccount.totalSponsors.toNumber(),
        0,
        "Total sponsors should be 0"
      );

      console.log("✅ Fee pool initialized successfully!");
    } catch (error) {
      console.error("Error initializing fee pool:", error);
      throw error;
    }
  });

  it("Sponsor can deposit USDC", async () => {
    const depositAmount = new anchor.BN(50_000 * 1e6); // 50k USDC

    try {
      const tx = await program.methods
        .sponsorDeposit(depositAmount)
        .accounts({
          feePool: feePoolPda,
          sponsorRecord: sponsorRecordPda,
          usdcVault: usdcVaultPda,
          sponsorUsdc: sponsorUsdcAccount.address,
          sponsor: sponsor.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([sponsor])
        .rpc();

      console.log("Deposit tx:", tx);

      // Verify fee pool was updated
      const feePoolAccount = await program.account.feePool.fetch(feePoolPda);
      assert.equal(
        feePoolAccount.totalDeposited.toString(),
        depositAmount.toString(),
        "Total deposited mismatch"
      );
      assert.equal(
        feePoolAccount.totalSponsors.toNumber(),
        1,
        "Total sponsors should be 1"
      );

      // Verify sponsor record
      const sponsorRecord = await program.account.sponsorRecord.fetch(sponsorRecordPda);
      assert.equal(
        sponsorRecord.sponsor.toBase58(),
        sponsor.publicKey.toBase58(),
        "Sponsor pubkey mismatch"
      );
      assert.equal(
        sponsorRecord.totalContributed.toString(),
        depositAmount.toString(),
        "Sponsor contribution mismatch"
      );

      console.log("✅ Sponsor deposit successful!");
      console.log("Total in pool:", feePoolAccount.totalDeposited.toString());
    } catch (error) {
      console.error("Error depositing:", error);
      throw error;
    }
  });

  it("Authority can withdraw for conversion", async () => {
    const withdrawAmount = new anchor.BN(10_000 * 1e6); // 10k USDC

    try {
      const tx = await program.methods
        .withdrawForConversion(withdrawAmount)
        .accounts({
          feePool: feePoolPda,
          usdcVault: usdcVaultPda,
          destinationUsdc: authorityUsdcAccount.address,
          authority: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log("Withdraw tx:", tx);

      // Verify fee pool was updated
      const feePoolAccount = await program.account.feePool.fetch(feePoolPda);
      assert.equal(
        feePoolAccount.totalWithdrawn.toString(),
        withdrawAmount.toString(),
        "Total withdrawn mismatch"
      );

      // Verify destination received USDC
      const destinationBalance = await provider.connection.getTokenAccountBalance(
        authorityUsdcAccount.address
      );
      assert.equal(
        destinationBalance.value.amount,
        withdrawAmount.toString(),
        "Destination balance mismatch"
      );

      console.log("✅ Withdrawal successful!");
      console.log("Amount withdrawn:", withdrawAmount.toString());
      console.log("Remaining in pool:", feePoolAccount.totalDeposited.sub(feePoolAccount.totalWithdrawn).toString());
    } catch (error) {
      console.error("Error withdrawing:", error);
      throw error;
    }
  });

  it("Multiple sponsors can deposit", async () => {
    const sponsor2 = anchor.web3.Keypair.generate();

    // Airdrop SOL
    const sig = await provider.connection.requestAirdrop(
      sponsor2.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    // Create token account
    const sponsor2UsdcAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      usdcMint,
      sponsor2.publicKey
    );

    // Mint USDC
    await mintTo(
      provider.connection,
      authority.payer,
      usdcMint,
      sponsor2UsdcAccount.address,
      authority.payer,
      100_000 * 1e6
    );

    // Derive PDA for sponsor2
    const [sponsor2RecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("sponsor_record"), sponsor2.publicKey.toBuffer()],
      program.programId
    );

    const depositAmount = new anchor.BN(25_000 * 1e6);

    const tx = await program.methods
      .sponsorDeposit(depositAmount)
      .accounts({
        feePool: feePoolPda,
        sponsorRecord: sponsor2RecordPda,
        usdcVault: usdcVaultPda,
        sponsorUsdc: sponsor2UsdcAccount.address,
        sponsor: sponsor2.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([sponsor2])
      .rpc();

    console.log("Second sponsor deposit tx:", tx);

    const feePoolAccount = await program.account.feePool.fetch(feePoolPda);
    assert.equal(
      feePoolAccount.totalSponsors.toNumber(),
      2,
      "Should have 2 sponsors"
    );

    console.log("✅ Multiple sponsors working correctly!");
    console.log("Total sponsors:", feePoolAccount.totalSponsors.toString());
  });
});
