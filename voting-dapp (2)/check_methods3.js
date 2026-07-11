import { JsonRpcProvider, Contract } from 'ethers';

async function main() {
  const address = "0x934b820eABEB96B248C7625A5aE4dA2F0735E00B";
  const rpc = "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new JsonRpcProvider(rpc);
  
  for (let sig of ["0x7de418d5", "0x2d35a8a2", "0x85a38635"]) {
      try {
        const result = await provider.call({to: address, data: sig});
        console.log(sig, "Result:", result);
      } catch(e) {
          console.log(sig, "Reverted");
      }
  }
}
main().catch(console.error);
