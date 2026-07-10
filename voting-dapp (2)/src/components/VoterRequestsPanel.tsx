import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { CheckCircle2, XCircle, Loader2, FileText } from 'lucide-react';

interface VoterRequest {
  _id: string;
  walletAddress: string;
  fullName: string;
  identityProofBase64: string;
  identityProofMimeType: string;
  status: string;
  submittedAt: string;
}

export const VoterRequestsPanel = () => {
  const { contract, signer } = useWeb3();
  const [requests, setRequests] = useState<VoterRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchRequests = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const timestamp = Date.now();
      const message = `I am an admin logging in at ${timestamp}`;
      const signature = await signer!.signMessage(message);

      const res = await fetch('/api/voter-requests?status=pending', {
        headers: {
          'x-admin-signature': signature,
          'x-admin-message': message
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
        setHasLoaded(true);
      } else {
        setErrorMsg('Failed to fetch requests.');
      }
    } catch (e: any) {
      console.error(e);
      if (e.code === 'ACTION_REJECTED' || (e.message && e.message.includes('rejected'))) {
        setErrorMsg('Signature rejected. You must sign the message to verify you are an admin.');
      } else {
        setErrorMsg('An error occurred while fetching requests.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (req: VoterRequest) => {
    if (!contract || !signer) return;
    setProcessingId(req._id);
    try {
      // 1. Register on-chain
      const tx = await contract.registerVoter(req.walletAddress);
      await tx.wait();

      // 2. Update off-chain
      const timestamp = Date.now();
      const message = `I am an admin logging in at ${timestamp}`;
      const signature = await signer.signMessage(message);

      await fetch(`/api/voter-requests/${req._id}/approve`, {
        method: 'PATCH',
        headers: {
          'x-admin-signature': signature,
          'x-admin-message': message
        }
      });

      // Remove from list
      setRequests(prev => prev.filter(r => r._id !== req._id));
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: VoterRequest) => {
    if (!signer) return;
    setProcessingId(req._id);
    try {
      const timestamp = Date.now();
      const message = `I am an admin logging in at ${timestamp}`;
      const signature = await signer.signMessage(message);

      await fetch(`/api/voter-requests/${req._id}/reject`, {
        method: 'PATCH',
        headers: {
          'x-admin-signature': signature,
          'x-admin-message': message
        }
      });

      // Remove from list
      setRequests(prev => prev.filter(r => r._id !== req._id));
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  if (!hasLoaded) {
    return (
      <div className="py-4 flex flex-col items-start gap-3">
        <p className="text-sm text-slate-600">Pending requests must be loaded securely via admin signature.</p>
        {errorMsg && <p className="text-sm font-semibold text-red-600">{errorMsg}</p>}
        <button 
          onClick={fetchRequests}
          disabled={isLoading || !signer}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {isLoading ? 'Requesting Signature...' : 'Load Pending Requests'}
        </button>
      </div>
    );
  }

  if (requests.length === 0) {
    return <div className="text-sm text-slate-500 py-4 italic">No pending voter requests.</div>;
  }

  return (
    <div className="space-y-4">
      {requests.map(req => (
        <div key={req._id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center shadow-sm">
          <div className="flex-1 space-y-1">
            <h4 className="font-bold text-slate-800">{req.fullName}</h4>
            <p className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded inline-block">{req.walletAddress}</p>
            <p className="text-xs text-slate-400">Applied: {new Date(req.submittedAt).toLocaleDateString()}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <a 
              href={req.identityProofBase64} 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg"
            >
              <FileText className="w-3.5 h-3.5" />
              View Proof
            </a>

            <div className="flex gap-2">
              <button 
                onClick={() => handleReject(req)}
                disabled={processingId !== null}
                className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>
              <button 
                onClick={() => handleApprove(req)}
                disabled={processingId !== null}
                className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {processingId === req._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Approve
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
