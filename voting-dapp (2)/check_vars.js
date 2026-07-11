import { JsonRpcProvider, Contract } from 'ethers';
import fs from 'fs';

async function main() {
  const abi = JSON.parse(fs.readFileSync('./src/contracts/VotingSystemABI.json'));
  const address = "0x934b820eABEB96B248C7625A5aE4dA2F0735E00B";
  const rpc = "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new JsonRpcProvider(rpc);
  const contract = new Contract(address, abi, provider);
  
  console.log("currentElectionId:", await contract.currentElectionId());
  console.log("totalVotesCast:", await contract.totalVotesCast(await contract.currentElectionId()));
  console.log("candidatesCount:", await contract.candidatesCount(await contract.currentElectionId()));
  console.log("registeredVoterCount:", await contract.registeredVoterCount());
  console.log("votingEnd:", await contract.votingEnd(await contract.currentElectionId()));
  console.log("votingStart:", await contract.votingStart(await contract.currentElectionId()));
}
main().catch(console.error);
