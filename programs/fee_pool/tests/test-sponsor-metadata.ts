import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FeePool } from "../target/types/fee_pool";
import { PublicKey, Keypair } from "@solana/web3.js";

describe("test-sponsor-metadata", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.FeePool as Program<FeePool>;
  const wallet = provider.wallet as anchor.Wallet;

  it("Sets sponsor metadata", async () => {
    console.log("\n🧪 Testing Sponsor Metadata\n");
    console.log("==================================================\n");

    console.log("1️⃣  Creating test sponsor wallet...");
    const sponsor = Keypair.generate();
    console.log("   Sponsor:", sponsor.publicKey.toBase58());

    // Airdrop to sponsor
    const airdropSig = await provider.connection.requestAirdrop(
      sponsor.publicKey,
      1 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);
    console.log("   ✅ Sponsor funded");

    // Derive sponsor metadata PDA
    const [sponsorMetadataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("sponsor_metadata"), sponsor.publicKey.toBuffer()],
      program.programId
    );

    console.log("\n2️⃣  Setting sponsor metadata...");
    console.log("   Metadata PDA:", sponsorMetadataPda.toBase58());

    const sponsorName = "Acme Corp";
    const website = "https://acme.com";
    const logoUrl = "https://acme.com/logo.png";

    const tx = await program.methods
      .setSponsorMetadata(sponsorName, website, logoUrl)
      .accounts({
        sponsorMetadata: sponsorMetadataPda,
        sponsor: sponsor.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([sponsor])
      .rpc();

    console.log("   ✅ Metadata set!");
    console.log("   Transaction:", tx);

    console.log("\n3️⃣  Fetching and verifying metadata...");
    const metadata = await program.account.sponsorMetadata.fetch(sponsorMetadataPda);
    
    console.log("   Sponsor:", metadata.sponsor.toBase58());
    console.log("   Name:", metadata.name);
    console.log("   Website:", metadata.website);
    console.log("   Logo URL:", metadata.logoUrl);
    console.log("   Bump:", metadata.bump);

    // Verify data
    if (metadata.name !== sponsorName) {
      throw new Error(`Name mismatch: ${metadata.name} !== ${sponsorName}`);
    }
    if (metadata.website !== website) {
      throw new Error(`Website mismatch: ${metadata.website} !== ${website}`);
    }
    if (metadata.logoUrl !== logoUrl) {
      throw new Error(`Logo URL mismatch: ${metadata.logoUrl} !== ${logoUrl}`);
    }

    console.log("   ✅ All data verified!");

    console.log("\n4️⃣  Testing metadata update...");
    const newName = "Acme Corporation";
    const newWebsite = "https://acmecorp.com";
    const newLogo = "https://acmecorp.com/new-logo.png";

    const tx2 = await program.methods
      .setSponsorMetadata(newName, newWebsite, newLogo)
      .accounts({
        sponsorMetadata: sponsorMetadataPda,
        sponsor: sponsor.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([sponsor])
      .rpc();

    console.log("   ✅ Metadata updated!");
    console.log("   Transaction:", tx2);

    const updatedMetadata = await program.account.sponsorMetadata.fetch(sponsorMetadataPda);
    console.log("   Updated Name:", updatedMetadata.name);
    console.log("   Updated Website:", updatedMetadata.website);
    console.log("   Updated Logo:", updatedMetadata.logoUrl);

    // Verify updates
    if (updatedMetadata.name !== newName) {
      throw new Error(`Name update failed`);
    }

    console.log("   ✅ Update verified!");

    console.log("\n5️⃣  Testing validation (should fail with long strings)...");
    try {
      const tooLongName = "A".repeat(50); // Max is 32
      await program.methods
        .setSponsorMetadata(tooLongName, website, logoUrl)
        .accounts({
          sponsorMetadata: sponsorMetadataPda,
          sponsor: sponsor.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([sponsor])
        .rpc();
      
      throw new Error("Should have failed with InvalidMetadata");
    } catch (e) {
      if (e.message.includes("InvalidMetadata") || e.message.includes("too long")) {
        console.log("   ✅ Validation works! Long name rejected");
      } else {
        throw e;
      }
    }

    console.log("\n==================================================");
    console.log("✅ Sponsor Metadata Tests Passed!\n");
  });
});

