import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { Users, UserPlus, Play, Square, Pause, PlayCircle, Shield, Settings } from 'lucide-react';
import { VoterBulkUpload } from './VoterBulkUpload';
import { VoterRequestsPanel } from './VoterRequestsPanel';

export const AdminDashboard = () => {
  const { contract, currentPhase, fetchPhase, account, signer } = useWeb3();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [candidateName, setCandidateName] = useState('');
  const [candidateParty, setCandidateParty] = useState('');
  const [singleVoter, setSingleVoter] = useState('');
  const [batchVoters, setBatchVoters] = useState('');
  const [votingDuration, setVotingDuration] = useState('60');
  
  const [isOwner, setIsOwner] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [newAdmin, setNewAdmin] = useState('');
  const [removeAdminAddr, setRemoveAdminAddr] = useState('');

  const [metaCandidateId, setMetaCandidateId] = useState('');
  const [metaBio, setMetaBio] = useState('');
  const [metaPhotoUrl, setMetaPhotoUrl] = useState('');
  const [metaManifesto, setMetaManifesto] = useState('');

  const handleUpdateMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) return;
    
    try {
      const timestamp = Date.now();
      const message = `I am an admin logging in at ${timestamp}`;
      const signature = await signer.signMessage(message);

      const response = await fetch(`/api/candidates/${metaCandidateId}/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-signature': signature,
          'x-admin-message': message
        },
        body: JSON.stringify({
          bio: metaBio,
          photoUrl: metaPhotoUrl,
          manifesto: metaManifesto
        })
      });

      if (response.ok) {
        alert('Metadata updated successfully');
        setMetaCandidateId('');
        setMetaBio('');
        setMetaPhotoUrl('');
        setMetaManifesto('');
      } else {
        const data = await response.json();
        alert(`Failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to sign message or update metadata');
    }
  };

  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/candidates');
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || data);
      }
    } catch (e) {
      console.error('Failed to fetch candidates', e);
    }
  };

  useEffect(() => {
    const checkOwner = async () => {
      if (contract && account) {
        try {
          const owner = await contract.owner();
          setIsOwner(owner.toLowerCase() === account.toLowerCase());
          
          const paused = await contract.paused();
          setIsPaused(paused);
        } catch (e) {
          console.error(e);
        }
      }
    };
    checkOwner();
    fetchCandidates();
  }, [contract, account, currentPhase]);

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    try {
      const tx = await contract.addCandidate(candidateName, candidateParty);
      await tx.wait();
      setCandidateName('');
      setCandidateParty('');
      alert("Candidate added!");
      fetchCandidates();
    } catch (err) {
      console.error(err);
      alert("Failed to add candidate");
    }
  };

  const handleSetCandidateActive = async (id: number, isActive: boolean) => {
    if (!contract) return;
    try {
      const tx = await contract.setCandidateActive(id, isActive);
      await tx.wait();
      alert(`Candidate ${isActive ? 'reactivated' : 'deactivated'} successfully!`);
      fetchCandidates();
    } catch (err) {
      console.error(err);
      alert("Failed to change candidate status");
    }
  };

  const handleStartNewElection = async () => {
    if (!contract) return;
    try {
      const tx = await contract.startNewElection();
      await tx.wait();
      alert("New election started successfully!");
      fetchPhase();
    } catch (err) {
      console.error(err);
      alert("Failed to start new election");
    }
  };

  const handleRegisterVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    try {
      const tx = await contract.registerVoter(singleVoter);
      await tx.wait();
      setSingleVoter('');
      alert("Voter registered!");
    } catch (err) {
      console.error(err);
      alert("Failed to register voter");
    }
  };

  const handleBatchRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    try {
      const addresses = batchVoters.split('\n').map(a => a.trim()).filter(a => a);
      const tx = await contract.registerVotersBatch(addresses);
      await tx.wait();
      setBatchVoters('');
      alert(`${addresses.length} voters registered!`);
    } catch (err) {
      console.error(err);
      alert("Failed to register voters");
    }
  };

  const handleStartVoting = async () => {
    if (!contract) return;
    try {
      const tx = await contract.startVoting(parseInt(votingDuration, 10));
      await tx.wait();
      await fetchPhase();
    } catch (err) {
      console.error(err);
      alert("Failed to start voting");
    }
  };

  const handleEndVoting = async () => {
    if (!contract) return;
    try {
      const tx = await contract.endVoting();
      await tx.wait();
      await fetchPhase();
    } catch (err) {
      console.error(err);
      alert("Failed to end voting");
    }
  };

  const togglePause = async () => {
    if (!contract) return;
    try {
      const tx = isPaused ? await contract.unpause() : await contract.pause();
      await tx.wait();
      setIsPaused(!isPaused);
    } catch (err) {
      console.error(err);
      alert("Failed to toggle pause");
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    try {
      const tx = await contract.addAdmin(newAdmin);
      await tx.wait();
      setNewAdmin('');
      alert("Admin added");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    try {
      const tx = await contract.removeAdmin(removeAdminAddr);
      await tx.wait();
      setRemoveAdminAddr('');
      alert("Admin removed");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          Admin Dashboard
        </h2>
        {isOwner && (
          <button 
            onClick={togglePause}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${isPaused ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'}`}
          >
            {isPaused ? <PlayCircle className="w-4 h-4"/> : <Pause className="w-4 h-4"/>}
            {isPaused ? 'Unpause Contract' : 'Pause Contract'}
          </button>
        )}
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-slate-50">
        
        {/* Left Column */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Play className="w-4 h-4 text-indigo-500" /> Phase Control
            </h3>
            
            {currentPhase === 0 && (
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duration (Minutes)</label>
                  <input 
                    type="number" 
                    value={votingDuration} 
                    onChange={e => setVotingDuration(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                  />
                </div>
                <button 
                  onClick={handleStartVoting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md shadow-indigo-200 transition-all text-sm"
                >
                  Start Voting
                </button>
              </div>
            )}

            {currentPhase === 1 && (
              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-indigo-900">Voting is Live</div>
                  <div className="text-xs font-medium text-indigo-700">End it manually if needed</div>
                </div>
                <button 
                  onClick={handleEndVoting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md shadow-indigo-200 transition-all"
                >
                  <Square className="w-4 h-4" /> End Voting
                </button>
              </div>
            )}

            {currentPhase === 2 && (
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between mt-4">
                <div>
                  <div className="text-sm font-bold text-emerald-900">Election Ended</div>
                  <div className="text-xs font-medium text-emerald-700">Ready for a new round</div>
                </div>
                <button 
                  onClick={handleStartNewElection}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md shadow-emerald-200 transition-all"
                >
                  <PlayCircle className="w-4 h-4" /> Start New Election
                </button>
              </div>
            )}
          </div>

          {/* Add Candidate */}
          {currentPhase === 0 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-500" /> Add Candidate
              </h3>
              <form onSubmit={handleAddCandidate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Name</label>
                  <input 
                    type="text" required value={candidateName} onChange={e => setCandidateName(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Party</label>
                  <input 
                    type="text" required value={candidateParty} onChange={e => setCandidateParty(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                  />
                </div>
                <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-lg transition-all text-sm">
                  Add Candidate
                </button>
              </form>
            </div>
          )}

          {/* Candidate List (Admin Management) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" /> Manage Candidates
            </h3>
            {candidates.length === 0 ? (
              <p className="text-sm text-slate-500">No candidates found.</p>
            ) : (
              <div className="space-y-3">
                {candidates.map((cand) => (
                  <div key={cand.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800 block text-sm">{cand.name}</span>
                      <span className="text-xs text-slate-500">{cand.party} • ID: {cand.id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${cand.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {cand.isActive !== false ? 'Active' : 'Paused/Removed'}
                      </span>
                      {currentPhase !== 2 && (
                        <button
                          onClick={() => handleSetCandidateActive(cand.id, cand.isActive === false ? true : false)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${cand.isActive !== false ? 'bg-amber-100 hover:bg-amber-200 text-amber-800' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800'}`}
                        >
                          {cand.isActive !== false ? (currentPhase === 0 ? 'Remove' : 'Pause') : 'Reactivate'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {currentPhase === 0 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-500" /> Update Candidate Metadata
              </h3>
              <form onSubmit={handleUpdateMetadata} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Candidate ID</label>
                  <input 
                    type="number" required value={metaCandidateId} onChange={e => setMetaCandidateId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Photo URL</label>
                  <input 
                    type="text" value={metaPhotoUrl} onChange={e => setMetaPhotoUrl(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bio</label>
                  <textarea 
                    value={metaBio} onChange={e => setMetaBio(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                  />
                </div>
                <button type="submit" className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 rounded-lg transition-all text-sm border border-slate-300">
                  Update Metadata (Requires Signature)
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {currentPhase === 0 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Register Voters
              </h3>
              
              <div className="space-y-6">
                <form onSubmit={handleRegisterVoter} className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Single Address</label>
                    <input 
                      type="text" required value={singleVoter} onChange={e => setSingleVoter(e.target.value)}
                      placeholder="0x..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                    />
                  </div>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg shadow-md shadow-indigo-200 transition-all text-sm">
                    Register
                  </button>
                </form>

                <hr className="border-slate-100" />

                <form onSubmit={handleBatchRegister}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Batch Addresses (one per line)</label>
                  <textarea 
                    required value={batchVoters} onChange={e => setBatchVoters(e.target.value)}
                    rows={4}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm mb-3 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                    placeholder="0x...\n0x..."
                  />
                  <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-lg transition-all text-sm">
                    Batch Register
                  </button>
                </form>
              </div>
            </div>
          )}

          {currentPhase === 0 && <VoterBulkUpload />}

          {/* Pending Voter Requests Panel */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm col-span-1 lg:col-span-2 mt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" /> Pending Voter Requests
            </h3>
            <VoterRequestsPanel />
          </div>

          {/* Owner only: Admins */}
          {isOwner && (
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-500" /> Manage Admins
              </h3>
              <div className="space-y-6">
                <form onSubmit={handleAddAdmin} className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Add Admin Address</label>
                    <input 
                      type="text" required value={newAdmin} onChange={e => setNewAdmin(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all"
                    />
                  </div>
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg shadow-md shadow-emerald-200 transition-all text-sm">
                    Add
                  </button>
                </form>
                <form onSubmit={handleRemoveAdmin} className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Remove Admin Address</label>
                    <input 
                      type="text" required value={removeAdminAddr} onChange={e => setRemoveAdminAddr(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all"
                    />
                  </div>
                  <button type="submit" className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg shadow-md shadow-red-200 transition-all text-sm">
                    Remove
                  </button>
                </form>
              </div>
             </div>
          )}
        </div>

      </div>
    </div>
  );
};
