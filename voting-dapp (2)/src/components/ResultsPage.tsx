import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trophy, Users, BarChart3 } from 'lucide-react';

interface ResultCandidate {
  id: number;
  name: string;
  party: string;
  voteCount: number;
}

interface Winner {
  winnerId: number;
  name: string;
  voteCount: number;
}

export const ResultsPage = () => {
  const { contract } = useWeb3();
  const [candidates, setCandidates] = useState<ResultCandidate[]>([]);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [stats, setStats] = useState({ totalVotes: 0, registeredVoters: 0 });

  useEffect(() => {
    const fetchResults = async () => {
      if (contract) {
        try {
          // Fetch from contract
          const cands = await contract.getAllCandidates();
          const parsedCands = cands.map((c: any) => ({
            id: Number(c.id),
            name: c.name,
            party: c.party,
            voteCount: Number(c.voteCount)
          }));
          setCandidates(parsedCands);

          const win = await contract.getWinner();
          setWinner({
            winnerId: Number(win.winnerId),
            name: win.name,
            voteCount: Number(win.voteCount)
          });

          const total = await contract.totalVotesCast();
          const reg = await contract.registeredVoterCount();
          setStats({
            totalVotes: Number(total),
            registeredVoters: Number(reg)
          });
        } catch (e) {
          console.error("Failed to fetch results", e);
        }
      }
    };
    fetchResults();
  }, [contract]);

  const turnout = stats.registeredVoters > 0 
    ? Math.round((stats.totalVotes / stats.registeredVoters) * 100) 
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 flex-1">
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Election Results</h2>
        <div className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium border border-slate-200">
          Voting Closed
        </div>
      </div>

      {winner && (
        <div className="bg-indigo-600 rounded-2xl p-8 text-white shadow-lg shadow-indigo-200 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500 opacity-20 rounded-full blur-3xl"></div>
          
          <Trophy className="w-12 h-12 mb-4 text-yellow-300 z-10" />
          <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mb-2 z-10">Election Winner</div>
          <h3 className="text-4xl font-bold mb-4 z-10">{winner.name}</h3>
          <div className="inline-block bg-white/10 backdrop-blur-md px-6 py-2 rounded-full font-semibold text-sm border border-white/20 z-10">
            {winner.voteCount} Votes
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Votes Cast</div>
            <div className="text-3xl font-bold text-slate-900">{stats.totalVotes}</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Voter Turnout</div>
            <div className="text-3xl font-bold text-slate-900 flex items-baseline gap-2">
              {turnout}%
              <span className="text-sm font-medium text-slate-400 normal-case tracking-normal">({stats.registeredVoters} registered)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Vote Distribution</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={candidates} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px' }}
                itemStyle={{ color: '#0f172a', fontWeight: 600, fontSize: '14px' }}
              />
              <Bar dataKey="voteCount" radius={[6, 6, 0, 0]}>
                {candidates.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.id === winner?.winnerId ? '#4f46e5' : '#cbd5e1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
