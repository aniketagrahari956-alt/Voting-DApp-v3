import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { History, Trophy, Users } from 'lucide-react';

export const ElectionHistory = () => {
  const { currentElectionId } = useWeb3();
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!currentElectionId || currentElectionId <= 1) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = [];
        for (let i = 1; i < currentElectionId; i++) {
          const res = await fetch(`/api/history/${i}`);
          if (res.ok) {
            data.push(await res.json());
          }
        }
        setHistoryData(data.reverse()); // latest past elections first
      } catch (err) {
        console.error("Failed to fetch history", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [currentElectionId]);

  if (loading) {
    return <div className="text-center py-12 text-slate-500 font-medium">Loading election history...</div>;
  }

  if (historyData.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center">
        <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800">No Past Elections</h3>
        <p className="text-slate-500 mt-2">There is no history of past elections yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <History className="w-6 h-6 text-indigo-500" /> Election History
      </h2>
      
      {historyData.map((election) => (
        <div key={election.electionId} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3 flex items-center justify-between">
            <span>Election #{election.electionId}</span>
            {election.winner && (
              <span className="text-sm font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full flex items-center gap-1">
                <Trophy className="w-4 h-4 text-amber-500" /> Winner: {election.winner.name} ({election.winner.voteCount} votes)
              </span>
            )}
          </h3>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Candidates
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {election.candidates.map((cand: any) => (
                <div key={cand.id} className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{cand.name}</div>
                    <div className="text-xs text-slate-500">{cand.party}</div>
                  </div>
                  <div className="text-lg font-black text-indigo-900 bg-indigo-50 px-3 py-1 rounded-lg">
                    {cand.voteCount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
