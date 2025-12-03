const { Connection, VersionedTransaction } = require('@solana/web3.js');

async function simulateTransaction() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Transaction from Kora logs
  const txBase64 = "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABeahDHNDzHRMbUDKlrsWMbi4BvhmddPcP1Ke9rIJGU/dO6ja7KG7TGs0e2yDfbIHWdTuI6oUOBuc3G0who0jcIAgACBbAmIjGqT9VazgSGkTznPxNGx0T8bv0itphFN9NJHfGxMCUR6OwTsCLMLYQn/kH6MFeLDqK/riH5V/QjlUgs9pgoxg202XijxWfGBIaRzQUJc/PVgB51LDsa9wuopXEgXgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA6KG6L3djlDs8Rn2+dqlZqNuBe2TJLC9O+YpjUyxff2Dv6KsHedNZaXOBvndGXqY38RVYkrf7/ziIJyoviNpa+AEEAwIBA2CQi5LwVzpcWgYAAABnZW1pbmkWAAAAaHR0cHM6Ly93d3cuZ2VtaW5pLmNvbTAAAABodHRwczovL3d3dy5nZW1pbmkuY29tL3N0YXRpYy9pbWFnZXMvb2ctbWV0YS5wbmc=";

  const txBuffer = Buffer.from(txBase64, 'base64');
  const tx = VersionedTransaction.deserialize(txBuffer);

  console.log('🧪 Simulating transaction on devnet...\n');

  try {
    const result = await connection.simulateTransaction(tx, {
      sigVerify: false, // Don't verify signatures for simulation
    });

    if (result.value.err) {
      console.log('❌ Simulation FAILED:');
      console.log('  Error:', JSON.stringify(result.value.err, null, 2));
      
      if (result.value.logs) {
        console.log('\n📜 Transaction logs:');
        result.value.logs.forEach(log => console.log('  ', log));
      }
    } else {
      console.log('✅ Simulation SUCCEEDED!');
      console.log('  Units consumed:', result.value.unitsConsumed);
      
      if (result.value.logs) {
        console.log('\n📜 Transaction logs:');
        result.value.logs.forEach(log => console.log('  ', log));
      }
    }
  } catch (error) {
    console.error('💥 Simulation error:', error.message);
  }
}

simulateTransaction();

