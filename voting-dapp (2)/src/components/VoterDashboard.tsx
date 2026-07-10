import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { ApplyToVote } from './ApplyToVote';

interface Candidate {
  id: number;
  name: string;
  party: string;
  isActive?: boolean;
  bio?: string;
  photoUrl?: string;
  manifesto?: string;
}

export const VoterDashboard = () => {
  const { contract, currentPhase, account } = useWeb3();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [votedCandidateId, setVotedCandidateId] = useState(0);
  
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (contract && account) {
        try {
          const status = await contract.getVoterStatus(account);
          setIsRegistered(status.isRegistered);
          setHasVoted(status.hasVoted);
          setVotedCandidateId(Number(status.votedCandidateId));

          const res = await fetch('/api/candidates');
          const mergedCandidates = await res.json();
          setCandidates(mergedCandidates.candidates || mergedCandidates); // handle both api response formats
        } catch (e) {
          console.error("Failed to fetch voter data", e);
        }
      }
    };
    fetchData();
  }, [contract, account, txHash]); // re-fetch if txHash changes (vote cast)

  const handleVote = async () => {
    if (!contract || !selectedId) return;
    setIsVoting(true);
    try {
      const tx = await contract.castVote(selectedId);
      await tx.wait();
      setTxHash(tx.hash);
      setHasVoted(true);
      setVotedCandidateId(selectedId);
    } catch (e) {
      console.error(e);
      alert("Voting failed. Make sure you are registered and haven't voted.");
    } finally {
      setIsVoting(false);
    }
  };

  if (!isRegistered) {
    return <ApplyToVote />;
  }

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Cast Your Vote</h2>
        {hasVoted && (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-full font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Vote Submitted
          </div>
        )}
      </div>

      {txHash && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <span className="font-medium text-sm">Your vote was successfully recorded on the blockchain!</span>
          <a 
            href={`https://sepolia.etherscan.io/tx/${txHash}`} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 underline font-semibold text-xs"
          >
            View on Etherscan <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.filter(c => c.isActive !== false).map(candidate => (
          <div 
            key={candidate.id}
            onClick={() => !hasVoted && currentPhase === 1 && setSelectedId(candidate.id)}
            className={`
              p-6 bg-white border rounded-xl shadow-sm transition-all relative
              ${hasVoted && votedCandidateId === candidate.id ? 'border-emerald-500 ring-2 ring-emerald-50' : ''}
              ${!hasVoted && currentPhase === 1 && selectedId === candidate.id ? 'border-indigo-500 ring-2 ring-indigo-50 cursor-pointer' : ''}
              ${!hasVoted && currentPhase === 1 && selectedId !== candidate.id ? 'border-slate-200 hover:border-indigo-300 cursor-pointer' : ''}
              ${(hasVoted || currentPhase !== 1) && votedCandidateId !== candidate.id ? 'border-slate-200 opacity-70 cursor-not-allowed' : ''}
            `}
          >
            {hasVoted && votedCandidateId === candidate.id && (
               <div className="absolute top-4 right-4 text-emerald-500 z-10">
                 <CheckCircle2 className="w-6 h-6 bg-white rounded-full" />
               </div>
            )}
            
            {candidate.photoUrl && (
              <img 
                src={candidate.photoUrl} 
                alt={candidate.name} 
                className="w-full h-48 object-cover rounded-lg mb-4 bg-slate-100"
              />
            )}
            
            <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block mb-2 uppercase tracking-wider">{candidate.party}</div>
            <h3 className="text-lg font-semibold text-slate-800 leading-snug mb-2">{candidate.name}</h3>
            
            {candidate.bio && (
              <p className="text-slate-600 text-sm line-clamp-3">{candidate.bio}</p>
            )}
          </div>
        ))}
      </div>

      {!hasVoted && (
        <div className="mt-8 flex justify-end">
          <button 
            onClick={handleVote}
            disabled={!selectedId || currentPhase !== 1 || isVoting}
            className={`
              py-3 px-6 rounded-xl font-bold shadow-lg transition-all
              ${selectedId && currentPhase === 1 && !isVoting ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200' : 'bg-slate-200 text-slate-500 shadow-none cursor-not-allowed'}
            `}
          >
            {isVoting ? 'Confirming...' : 'Submit Vote'}
          </button>
        </div>
      )}
      
      {currentPhase === 0 && !hasVoted && (
        <div className="text-center text-slate-500 mt-4 text-sm font-medium">
          Voting has not started yet.
        </div>
      )}
    </div>
  );
};
