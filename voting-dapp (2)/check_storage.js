import { JsonRpcProvider } from 'ethers';

async function main() {
  const address = "0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B";
  const rpc = "https://rpc-amoy.polygon.technology";
  const provider = new JsonRpcProvider(rpc);
  
  for (let i = 0; i < 10; i++) {
    const slot = await provider.getStorage(address, i);
    console.log(`Slot ${i}: ${slot}`);
  }
}
main().catch(console.error);
