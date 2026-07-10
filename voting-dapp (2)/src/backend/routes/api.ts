import express from 'express';
import { CandidateMeta } from '../models/CandidateMeta.js';
import { Voter } from '../models/Voter.js';
import { AuditLog } from '../models/AuditLog.js';
import { adminAuthMiddleware } from '../utils/auth.js';
import { JsonRpcProvider, Contract } from 'ethers';
import fs from 'fs';
import path from 'path';

export const apiRouter = express.Router();

const abiPath = path.resolve(process.cwd(), 'src/contracts/VotingSystemABI.json');
const VotingSystemABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

const getContract = () => {
  const rpcUrl = process.env.VITE_SEPOLIA_RPC_URL;
  const contractAddress = process.env.VITE_CONTRACT_ADDRESS;
  if (!rpcUrl || !contractAddress) return null;
  const provider = new JsonRpcProvider(rpcUrl);
  return new Contract(contractAddress, VotingSystemABI, provider);
};

// GET /api/candidates
apiRouter.get('/candidates', async (req, res) => {
  try {
    const contract = getContract();
    let onChainCandidates = [];
    if (contract) {
      onChainCandidates = await contract.getAllCandidates();
    }
    
    const dbMetadata = await CandidateMeta.find({});
    const metaMap = dbMetadata.reduce((acc: any, meta: any) => {
      acc[meta.candidateId] = meta;
      return acc;
    }, {});

    const merged = onChainCandidates.map((c: any) => ({
      id: Number(c.id),
      name: c.name,
      party: c.party,
      voteCount: Number(c.voteCount),
      isActive: c.isActive,
      bio: metaMap[Number(c.id)]?.bio || '',
      photoUrl: metaMap[Number(c.id)]?.photoUrl || '',
      manifesto: metaMap[Number(c.id)]?.manifesto || ''
    }));

    res.json(merged);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching candidates' });
  }
});

// POST /api/candidates/:id/metadata (Admin only)
apiRouter.post('/candidates/:id/metadata', adminAuthMiddleware, async (req, res) => {
  try {
    const candidateId = parseInt(req.params.id, 10);
    const { bio, photoUrl, manifesto } = req.body;

    const updated = await CandidateMeta.findOneAndUpdate(
      { candidateId },
      { bio, photoUrl, manifesto },
      { new: true, upsert: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update metadata' });
  }
});

// GET /api/voters/:address/status
apiRouter.get('/voters/:address/status', async (req, res) => {
  try {
    const { address } = req.params;
    const voter = await Voter.findOne({ address: address.toLowerCase() });
    
    // Also check on-chain if not in DB to be safe, but prompt says DB is cache.
    // We can rely on DB for now. If not in DB, assume false.
    res.json({
      isRegistered: voter?.isRegistered || false,
      hasVoted: voter?.hasVoted || false,
      votedCandidateId: voter?.votedCandidateId || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch voter status' });
  }
});

// GET /api/history/:electionId
apiRouter.get('/history/:electionId', async (req, res) => {
  try {
    const contract = getContract();
    if (!contract) return res.status(500).json({ error: 'Contract not configured' });
    
    const electionId = req.params.electionId;
    const candidates = await contract.getCandidatesForElection(electionId);
    let winner = null;
    try {
      const w = await contract.getElectionWinner(electionId);
      if (w.name) {
        winner = {
          winnerId: Number(w.winnerId),
          name: w.name,
          voteCount: Number(w.voteCount)
        };
      }
    } catch(e) {
      // winner might revert if no one voted or election doesn't exist
    }

    res.json({
      electionId: Number(electionId),
      candidates: candidates.map((c:any) => ({ id: Number(c.id), name: c.name, party: c.party, voteCount: Number(c.voteCount), isActive: c.isActive })),
      winner
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching history' });
  }
});

// GET /api/results (Could be just from contract, but let's expose it)
apiRouter.get('/results', async (req, res) => {
  try {
    const contract = getContract();
    if (!contract) return res.status(500).json({ error: 'Contract not configured' });
    
    const candidates = await contract.getAllCandidates();
    const phase = await contract.currentPhase();
    let winner = null;
    if (Number(phase) === 2) {
      const w = await contract.getWinner();
      winner = {
        winnerId: Number(w.winnerId),
        name: w.name,
        voteCount: Number(w.voteCount)
      };
    }
    const totalVotes = await contract.totalVotesCast();
    const registeredCount = await contract.registeredVoterCount();

    res.json({
      candidates: candidates.map((c:any) => ({ id: Number(c.id), name: c.name, party: c.party, voteCount: Number(c.voteCount), isActive: c.isActive })),
      winner,
      totalVotes: Number(totalVotes),
      registeredCount: Number(registeredCount)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// GET /api/audit-log
apiRouter.get('/audit-log', async (req, res) => {
  try {
    const logs = await AuditLog.find({}).sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// POST /api/audit-log (Manual custom logging endpoint)
apiRouter.post('/audit-log', async (req, res) => {
  try {
    const { eventName, txHash, blockNumber, data } = req.body;
    const newLog = await AuditLog.create({
      eventName: eventName || 'VoterBulkRegistration',
      txHash,
      blockNumber: blockNumber || 0,
      timestamp: new Date(),
      data
    });
    res.status(201).json(newLog);
  } catch (error: any) {
    // If it's a duplicate or other error, return gracefully
    res.status(500).json({ error: error.message || 'Failed to save audit log' });
  }
});

import { VoterRequest } from '../models/VoterRequest.js';

// POST /api/voter-requests
apiRouter.post('/voter-requests', async (req, res) => {
  try {
    const { walletAddress, fullName, identityProofBase64, identityProofMimeType } = req.body;
    
    if (!walletAddress || !fullName || !identityProofBase64) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const addressRegex = /^0x[a-fA-F0-9]{40}$/i;
    if (!addressRegex.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    const existing = await VoterRequest.findOne({ 
      walletAddress: walletAddress.toLowerCase(),
      status: { $in: ['pending', 'approved'] }
    });

    if (existing) {
      return res.status(400).json({ error: 'An application for this address already exists' });
    }

    const request = await VoterRequest.create({
      walletAddress: walletAddress.toLowerCase(),
      fullName,
      identityProofBase64,
      identityProofMimeType
    });

    res.status(201).json(request);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create voter request' });
  }
});

// GET /api/voter-requests?status=pending
apiRouter.get('/voter-requests', adminAuthMiddleware, async (req, res) => {
  try {
    const status = req.query.status as string;
    const query: any = status ? { status } : {};
    const requests = await VoterRequest.find(query).sort({ submittedAt: -1 });
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch voter requests' });
  }
});

// GET /api/voter-requests/:walletAddress
apiRouter.get('/voter-requests/:walletAddress', async (req, res) => {
  try {
    const request = await VoterRequest.findOne({ 
      walletAddress: req.params.walletAddress.toLowerCase() 
    }).sort({ submittedAt: -1 });
    
    if (!request) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.json(request);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch voter request' });
  }
});

// PATCH /api/voter-requests/:id/reject
apiRouter.patch('/voter-requests/:id/reject', adminAuthMiddleware, async (req, res) => {
  try {
    const request = await VoterRequest.findByIdAndUpdate(req.params.id, {
      status: 'rejected',
      reviewedAt: new Date(),
      reviewedBy: (req as any).adminAddress
    }, { new: true });
    
    if (!request) return res.status(404).json({ error: 'Not found' });
    res.json(request);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reject voter request' });
  }
});

// PATCH /api/voter-requests/:id/approve
apiRouter.patch('/voter-requests/:id/approve', adminAuthMiddleware, async (req, res) => {
  try {
    const request = await VoterRequest.findByIdAndUpdate(req.params.id, {
      status: 'approved',
      reviewedAt: new Date(),
      reviewedBy: (req as any).adminAddress
    }, { new: true });
    
    if (!request) return res.status(404).json({ error: 'Not found' });
    res.json(request);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to approve voter request' });
  }
});
