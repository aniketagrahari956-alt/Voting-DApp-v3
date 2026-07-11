import { JsonRpcProvider } from 'ethers';

async function main() {
  const address = "0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B";
  const rpc = "https://rpc-amoy.polygon.technology";
  const provider = new JsonRpcProvider(rpc);
  
  // Try calling some standard methods
  const methods = [
      "0x8da5cb5b", // owner()
      "0x42cbb15c", // symbol()
      "0x06fdde03", // name()
      "0x18160ddd", // totalSupply()
  ];
  for (let sig of methods) {
      try {
        const result = await provider.call({to: address, data: sig});
        console.log(sig, "Result:", result);
      } catch(e) {
          console.log(sig, "Reverted");
      }
  }
}
main().catch(console.error);
