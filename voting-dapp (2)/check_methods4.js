import { JsonRpcProvider } from 'ethers';

async function main() {
  const address = "0x934b820eABEB96B248C7625A5aE4dA2F0735E00B";
  const rpc = "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new JsonRpcProvider(rpc);
  
  try {
      // Simulate startNewElection() from owner
      const result = await provider.call({
          to: address, 
          data: "0x47f33fb5",
          from: "0x86844334Ab821996e7aA501cb609B2464c23C37e"
      });
      console.log("startNewElection Result:", result);
  } catch (e) {
      console.log("startNewElection Reverted:", e.reason || e.message);
  }
}
main().catch(console.error);
