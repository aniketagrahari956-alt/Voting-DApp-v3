import { JsonRpcProvider, Contract } from 'ethers';
import fs from 'fs';

async function main() {
  const abi = JSON.parse(fs.readFileSync('./src/contracts/VotingSystemABI.json'));
  const address = "0x934b820eABEB96B248C7625A5aE4dA2F0735E00B";
  const rpc = "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new JsonRpcProvider(rpc);
  
  const code = await provider.getCode(address);
  console.log("Code length on Sepolia:", code.length);
  
  if (code.length > 2) {
    const contract = new Contract(address, abi, provider);
    const phase = await contract.currentPhase();
    console.log("Current Phase:", phase);
    const owner = await contract.owner();
    console.log("Owner:", owner);
    const isAdmin = await contract.isAdmin("0x86844334Ab821996e7aA501cb609B2464c23C37e");
    console.log("Is Admin (user):", isAdmin);
  } else {
    const p2 = new JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const c2 = await p2.getCode(address);
    console.log("Code length on Amoy:", c2.length);
    if (c2.length > 2) {
      const contract = new Contract(address, abi, p2);
      const phase = await contract.currentPhase();
      console.log("Current Phase:", phase);
      const owner = await contract.owner();
      console.log("Owner:", owner);
      const isAdmin = await contract.isAdmin("0x86844334Ab821996e7aA501cb609B2464c23C37e");
      console.log("Is Admin (user):", isAdmin);
    }
  }
}
main().catch(console.error);
