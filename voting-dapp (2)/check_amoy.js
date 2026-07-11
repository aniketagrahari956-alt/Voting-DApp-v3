import { JsonRpcProvider, Contract } from 'ethers';
import fs from 'fs';

async function main() {
  const abi = JSON.parse(fs.readFileSync('./src/contracts/VotingSystemABI.json'));
  const address = "0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8";
  const rpc = "https://rpc-amoy.polygon.technology";
  const provider = new JsonRpcProvider(rpc);
  
  const contract = new Contract(address, abi, provider);
  const phase = await contract.currentPhase();
  console.log("Current Phase:", phase);
  
  const owner = await contract.owner();
  console.log("Owner:", owner);
  
  try {
      const isAdmin = await contract.isAdmin("0x86844334Ab821996e7aA501cb609B2464c23C37e");
      console.log("Is Admin (user):", isAdmin);
  } catch(e) {
      console.log("isAdmin reverted");
  }
}
main().catch(console.error);
