import { JsonRpcProvider } from 'ethers';
async function main() {
  const provider = new JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  const code = await provider.getCode("0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8");
  console.log("Length:", code.length);
  if (code.length > 2) {
    console.log("Has code");
    console.log("Has startNewElection?", code.includes("47f33fb5"));
  }
  else console.log("No code on Sepolia");
  
  const p2 = new JsonRpcProvider("https://eth.llamarpc.com");
  const c2 = await p2.getCode("0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8");
  if (c2.length > 2) console.log("Has code on Mainnet");
}
main();
