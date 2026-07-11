import { useWeb3 } from '../context/Web3Context';
import { Wallet, LogOut, AlertTriangle } from 'lucide-react';

export const ConnectWallet = () => {
  const { account, isCorrectNetwork, connectWallet, disconnectWallet } = useWeb3();

  if (!account) {
    return (
      <button 
        onClick={connectWallet}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl shadow-lg shadow-indigo-200 transition-all"
      >
        <Wallet className="w-4 h-4" />
        Connect MetaMask
      </button>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-100 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4" />
          Wrong Network
        </div>
        <div className="h-8 w-[1px] bg-slate-200"></div>
        <button 
          onClick={connectWallet} // re-triggers network switch in connect function
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Switch to Sepolia
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-xs font-semibold">
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
        Sepolia Active
      </div>
      <div className="h-8 w-[1px] bg-slate-200"></div>
      <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
        <span className="text-xs font-mono text-slate-500">{account.slice(0, 6)}...{account.slice(-4)}</span>
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500"></div>
        <button 
          onClick={disconnectWallet}
          className="ml-2 text-slate-400 hover:text-slate-600 transition-colors"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
