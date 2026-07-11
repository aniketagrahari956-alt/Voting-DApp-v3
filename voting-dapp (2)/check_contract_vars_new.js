import { JsonRpcProvider, Contract } from 'ethers';
import fs from 'fs';

async function main() {
  const abi = JSON.parse(fs.readFileSync('./src/contracts/VotingSystemABI.json'));
  const address = "0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B";
  const rpc = "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new JsonRpcProvider(rpc);
  const contract = new Contract(address, abi, provider);
  
  const paused = await contract.paused();
  const currentPhase = await contract.currentPhase();
  const candidatesCount = await contract.candidatesCount();
  const registeredVoterCount = await contract.registeredVoterCount();
  
  console.log({
      paused, currentPhase, candidatesCount, registeredVoterCount
  });
}
main().catch(console.error);
