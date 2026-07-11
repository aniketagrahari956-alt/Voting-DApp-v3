import { Contract, BrowserProvider, Signer } from 'ethers';
import VotingSystemABI from './VotingSystemABI.json';

// We get the contract address from env vars. We should handle it properly.
const CONTRACT_ADDRESS = import.meta.env.VITE_APP_CONTRACT_ADDRESS || '0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B';

export function getVotingContract(providerOrSigner: BrowserProvider | Signer): Contract {
  return new Contract(CONTRACT_ADDRESS, VotingSystemABI, providerOrSigner);
}
