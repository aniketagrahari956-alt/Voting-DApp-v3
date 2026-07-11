import { useEffect, useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { Clock } from 'lucide-react';

export const PhaseBanner = () => {
  const { contract, currentPhase, currentElectionId } = useWeb3();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    const checkTime = async () => {
      if (contract && currentPhase === 1) { // 1 = Voting
        try {
          const remaining = await contract.getTimeRemaining();
          setTimeRemaining(Number(remaining));
        } catch (e) {
          console.error("Failed to fetch time remaining", e);
        }
      }
    };

    if (currentPhase === 1) {
      checkTime();
      interval = setInterval(() => {
        setTimeRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [contract, currentPhase]);

  const phases = ['Registration', 'Voting', 'Ended'];
  const phaseName = currentPhase !== null ? phases[currentPhase] : 'Unknown';

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between text-sm shadow-sm">
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-500 uppercase tracking-widest text-xs">
            {currentElectionId ? `Election #${currentElectionId.toString()}` : 'Election'} Phase
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider
            ${currentPhase === 0 ? 'bg-indigo-50 text-indigo-600' : ''}
            ${currentPhase === 1 ? 'bg-emerald-50 text-emerald-600' : ''}
            ${currentPhase === 2 ? 'bg-slate-100 text-slate-500' : ''}
          `}>
            {phaseName.toUpperCase()}
          </span>
        </div>

        {currentPhase === 1 && (
          <div className="flex items-center gap-2 font-mono bg-slate-50 border border-slate-200 px-3 py-1 rounded text-slate-600 text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {timeRemaining > 0 ? formatTime(timeRemaining) : '00:00:00'}
          </div>
        )}
      </div>
    </div>
  );
};
