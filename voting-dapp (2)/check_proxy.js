import { JsonRpcProvider } from 'ethers';

async function main() {
  const address = "0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B";
  const rpc = "https://rpc-amoy.polygon.technology";
  const provider = new JsonRpcProvider(rpc);
  
  const slot = await provider.getStorage(address, "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc");
  console.log(`EIP-1967 Impl: ${slot}`);
  
  // also check 0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3
  const slot2 = await provider.getStorage(address, "0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3");
  console.log(`EIP-1967 Admin: ${slot2}`);
}
main().catch(console.error);
