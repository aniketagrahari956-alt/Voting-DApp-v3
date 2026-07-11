import { verifyMessage, Signer, Wallet } from 'ethers';

async function run() {
  const wallet = Wallet.createRandom();
  // We can't use random wallet because it won't be admin. 
  // Wait, I can just modify auth.ts to let any wallet be admin for a moment to debug, or use the hardcoded admin.
  // We don't have the private key for the hardcoded admin.
  console.log("Need admin private key");
}
run();
