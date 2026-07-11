import { JsonRpcProvider, Contract } from 'ethers';
import fs from 'fs';

async function main() {
  const abi = JSON.parse(fs.readFileSync('./src/contracts/VotingSystemABI.json'));
  const address = "0x934b820eABEB96B248C7625A5aE4dA2F0735E00B";
  const rpc = "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new JsonRpcProvider(rpc);
  const contract = new Contract(address, abi, provider);
  
  const paused = await contract.paused();
  console.log("Paused:", paused);
}
main().catch(console.error);
