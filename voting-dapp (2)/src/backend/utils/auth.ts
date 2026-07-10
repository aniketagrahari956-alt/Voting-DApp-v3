import { verifyMessage, JsonRpcProvider, Contract } from 'ethers';
import fs from 'fs';
import path from 'path';

let cachedAdmins = new Set<string>();
let lastCacheUpdate = 0;

export async function isAdmin(address: string): Promise<boolean> {
  const rpcUrl = process.env.VITE_SEPOLIA_RPC_URL;
  const contractAddress = process.env.VITE_CONTRACT_ADDRESS;

  if (!rpcUrl || !contractAddress) return false;

  const now = Date.now();
  if (now - lastCacheUpdate > 60000) { // cache for 1 min
    try {
      const provider = new JsonRpcProvider(rpcUrl);
      const abiPath = path.resolve(process.cwd(), 'src/contracts/VotingSystemABI.json');
      const VotingSystemABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
      const contract = new Contract(contractAddress, VotingSystemABI, provider);
      
      const isAdm = await contract.isAdmin(address);
      if (isAdm) {
        cachedAdmins.add(address.toLowerCase());
      } else {
        cachedAdmins.delete(address.toLowerCase());
      }
      lastCacheUpdate = now;
      return isAdm;
    } catch (e) {
      console.error('Error fetching admin status from contract', e);
      return cachedAdmins.has(address.toLowerCase());
    }
  }

  return cachedAdmins.has(address.toLowerCase());
}

export const adminAuthMiddleware = async (req: any, res: any, next: any) => {
  const signature = req.headers['x-admin-signature'];
  const message = req.headers['x-admin-message']; // "I am an admin logging in at <timestamp>"

  if (!signature || !message) {
    return res.status(401).json({ error: 'Missing signature or message' });
  }

  try {
    const recoveredAddress = verifyMessage(message, signature);
    const isValidAdmin = await isAdmin(recoveredAddress);
    if (!isValidAdmin) {
      return res.status(403).json({ error: 'Not an admin' });
    }
    
    // Check message freshness (prevent replay attack conceptually, just a basic check)
    const parts = message.split(' at ');
    if (parts.length === 2) {
      const ts = parseInt(parts[1], 10);
      if (Date.now() - ts > 1000 * 60 * 5) { // 5 minutes validity
        return res.status(401).json({ error: 'Message expired' });
      }
    }

    req.adminAddress = recoveredAddress;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
};
