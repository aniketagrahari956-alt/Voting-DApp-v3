import { JsonRpcProvider, Contract } from 'ethers';
import fs from 'fs';

async function main() {
  const abi = JSON.parse(fs.readFileSync('./src/contracts/VotingSystemABI.json'));
  const address = "0x934b820eABEB96B248C7625A5aE4dA2F0735E00B";
  const rpc = "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new JsonRpcProvider(rpc);
  const contract = new Contract(address, abi, provider);
  
  try {
    const data = contract.interface.encodeFunctionData("startNewElection", []);
    const tx = {
      to: address,
      data: data,
      from: "0x86844334Ab821996e7aA501cb609B2464c23C37e"
    };
    const result = await provider.call(tx);
    console.log("Call successful:", result);
  } catch (err) {
    console.log("Revert reason:", err.reason);
    console.log("Error info:", err.info);
    console.log("Error code:", err.code);
    console.log("Error message:", err.message);
    if (err.data) {
        console.log("Error data:", err.data);
    }
  }
}
main().catch(console.error);
