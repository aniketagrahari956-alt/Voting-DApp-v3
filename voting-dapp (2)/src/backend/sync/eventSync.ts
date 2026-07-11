import { JsonRpcProvider, Contract } from 'ethers';
import fs from 'fs';
import path from 'path';
import { Voter } from '../models/Voter.js';
import { AuditLog } from '../models/AuditLog.js';
import { CandidateMeta } from '../models/CandidateMeta.js'; // Just to have candidates cached if we want, but we also fetch real-time.

// Read ABI from file
const abiPath = path.resolve(process.cwd(), 'src/contracts/VotingSystemABI.json');
const VotingSystemABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

export async function startEventSync() {
  const rpcUrl = process.env.VITE_APP_RPC_URL || process.env.VITE_SEPOLIA_RPC_URL || 'https://rpc-amoy.polygon.technology';
  const contractAddress = process.env.VITE_APP_CONTRACT_ADDRESS || '0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B';

  if (!rpcUrl || !contractAddress) {
    console.warn('Missing RPC URL or Contract Address. Event sync disabled.');
    return;
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const contract = new Contract(contractAddress, VotingSystemABI, provider);

  console.log(`Starting event sync for contract ${contractAddress}`);

  // Listeners
  contract.on('VoterRegistered', async (voter, event) => {
    try {
      await Voter.findOneAndUpdate(
        { address: voter.toLowerCase() },
        { isRegistered: true },
        { upsert: true }
      );
      await logEvent('VoterRegistered', event, { voter });
    } catch (err) {
      console.error('Error syncing VoterRegistered', err);
    }
  });

  contract.on('VoteCast', async (voter, candidateId, timestamp, event) => {
    try {
      await Voter.findOneAndUpdate(
        { address: voter.toLowerCase() },
        { hasVoted: true, votedCandidateId: Number(candidateId) },
        { upsert: true }
      );
      await logEvent('VoteCast', event, { voter, candidateId: Number(candidateId), timestamp: Number(timestamp) });
    } catch (err) {
      console.error('Error syncing VoteCast', err);
    }
  });

  contract.on('CandidateAdded', async (id, name, party, event) => {
    try {
      await CandidateMeta.findOneAndUpdate(
        { candidateId: Number(id) },
        { $setOnInsert: { bio: '', photoUrl: '', manifesto: '' } }, // create meta if doesn't exist
        { upsert: true }
      );
      await logEvent('CandidateAdded', event, { id: Number(id), name, party });
    } catch (err) {
      console.error('Error syncing CandidateAdded', err);
    }
  });

  contract.on('PhaseChanged', async (newPhase, timestamp, event) => {
    try {
      await logEvent('PhaseChanged', event, { newPhase: Number(newPhase), timestamp: Number(timestamp) });
    } catch (err) {
      console.error('Error syncing PhaseChanged', err);
    }
  });

  contract.on('CandidateStatusChanged', async (electionId, candidateId, isActive, event) => {
    try {
      await logEvent('CandidateStatusChanged', event, { electionId: Number(electionId), candidateId: Number(candidateId), isActive });
    } catch (err) {
      console.error('Error syncing CandidateStatusChanged', err);
    }
  });

  contract.on('NewElectionStarted', async (electionId, timestamp, event) => {
    try {
      await logEvent('NewElectionStarted', event, { electionId: Number(electionId), timestamp: Number(timestamp) });
      // Reset all voter hasVoted status in local DB
      await Voter.updateMany({}, { hasVoted: false, votedCandidateId: 0 });
    } catch (err) {
      console.error('Error syncing NewElectionStarted', err);
    }
  });
}

async function logEvent(eventName: string, event: any, data: any) {
  const block = await event.getBlock();
  const timestamp = new Date(Number(block.timestamp) * 1000);
  
  await AuditLog.create({
    eventName,
    txHash: event.log.transactionHash,
    blockNumber: event.log.blockNumber,
    timestamp,
    data
  });
  console.log(`[Event Sync] ${eventName} synced (Tx: ${event.log.transactionHash})`);
}
