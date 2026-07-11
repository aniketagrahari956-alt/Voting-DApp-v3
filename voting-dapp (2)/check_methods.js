import { JsonRpcProvider, Contract } from 'ethers';

async function main() {
  const address = "0x934b820eABEB96B248C7625A5aE4dA2F0735E00B";
  const rpc = "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new JsonRpcProvider(rpc);
  
  // try calling different methods using raw data
  // name()
  let result = await provider.call({to: address, data: "0x06fdde03"}); // name
  console.log("name:", result);
}
main().catch(console.error);
