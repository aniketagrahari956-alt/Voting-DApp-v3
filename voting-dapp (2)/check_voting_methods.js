import { JsonRpcProvider } from 'ethers';

async function main() {
  const address = "0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B";
  const rpc = "https://rpc-amoy.polygon.technology";
  const provider = new JsonRpcProvider(rpc);
  
  const methods = [
      "0x2d35a8a2", // candidatesCount
      "0x7de418d5", // currentPhase
      "0x85a38635", // registeredVoterCount
      "0x5c975abb"  // paused
  ];
  for (let sig of methods) {
      try {
        const result = await provider.call({to: address, data: sig});
        console.log(sig, "Result:", result);
      } catch(e) {
          console.log(sig, "Reverted");
      }
  }
}
main().catch(console.error);
