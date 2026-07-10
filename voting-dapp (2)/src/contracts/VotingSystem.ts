import { Contract, BrowserProvider, Signer } from 'ethers';
import VotingSystemABI from './VotingSystemABI.json';

// We get the contract address from env vars. We should handle it properly.
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8';

export function getVotingContract(providerOrSigner: BrowserProvider | Signer): Contract {
  return new Contract(CONTRACT_ADDRESS, VotingSystemABI, providerOrSigner);
}
