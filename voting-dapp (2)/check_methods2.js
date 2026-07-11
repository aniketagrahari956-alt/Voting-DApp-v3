import { JsonRpcProvider, Contract } from 'ethers';
import fs from 'fs';

async function main() {
  const address = "0x934b820eABEB96B248C7625A5aE4dA2F0735E00B";
  const rpc = "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new JsonRpcProvider(rpc);
  
  // try calling totalVotesCast() without args! (In older version, it might not take electionId)
  let result = await provider.call({to: address, data: "0xb1081333"}); // totalVotesCast() ? Let's check hash.
}
main().catch(console.error);
