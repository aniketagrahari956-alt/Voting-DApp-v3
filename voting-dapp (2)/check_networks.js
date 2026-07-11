import { JsonRpcProvider } from 'ethers';

const rpcs = {
  sepolia: 'https://ethereum-sepolia-rpc.publicnode.com',
  amoy: 'https://rpc-amoy.polygon.technology',
  baseSepolia: 'https://sepolia.base.org',
  arbSepolia: 'https://sepolia-rollup.arbitrum.io/rpc',
  opSepolia: 'https://sepolia.optimism.io',
  holesky: 'https://ethereum-holesky-rpc.publicnode.com'
};

const address = '0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B';

async function main() {
  for (const [name, url] of Object.entries(rpcs)) {
    try {
      const provider = new JsonRpcProvider(url);
      const code = await provider.getCode(address);
      if (code && code !== '0x') {
        console.log(`Found on ${name}!`);
        const network = await provider.getNetwork();
        console.log(`Chain ID: ${network.chainId}`);
      }
    } catch(e) {
      console.log(`Error on ${name}`);
    }
  }
}

main();
