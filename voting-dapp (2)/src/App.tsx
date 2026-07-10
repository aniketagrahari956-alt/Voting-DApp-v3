/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Web3Provider, useWeb3 } from './context/Web3Context';
import { ConnectWallet } from './components/ConnectWallet';
import { PhaseBanner } from './components/PhaseBanner';
import { AdminDashboard } from './components/AdminDashboard';
import { VoterDashboard } from './components/VoterDashboard';
import { ResultsPage } from './components/ResultsPage';
import { ElectionHistory } from './components/ElectionHistory';
import { AlertCircle, X, History, Activity } from 'lucide-react';
import { useState } from 'react';

function MainApp() {
  const { account, isAdmin, currentPhase, connectionError, clearError } = useWeb3();
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 shadow-sm px-8 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Decentralized Voting</h1>
          </div>

          {account && (
            <div className="hidden md:flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('current')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${activeTab === 'current' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Activity className="w-4 h-4" /> Current
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <History className="w-4 h-4" /> History
              </button>
            </div>
          )}
        </div>
        <ConnectWallet />
      </header>
      
      {connectionError && (
        <div className="bg-red-50 border-b border-red-100 text-red-700 px-8 py-3 flex items-start sm:items-center justify-between shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0 text-red-500" />
            <p className="text-sm font-medium">{connectionError}</p>
          </div>
          <button onClick={clearError} className="p-1 hover:bg-red-100 rounded transition-colors ml-4 shrink-0">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {activeTab === 'current' && <PhaseBanner />}

      <main className="flex-1 flex gap-6 p-6 max-w-7xl mx-auto w-full">
        {!account ? (
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center p-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Welcome to the Voting DApp</h2>
            <p className="text-slate-600 mb-8 leading-relaxed">Please connect your MetaMask wallet to participate or view results.</p>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-6">
            {activeTab === 'current' ? (
              <>
                {isAdmin && <AdminDashboard />}
                
                {currentPhase !== 2 && (
                  <VoterDashboard />
                )}

                {currentPhase === 2 && (
                  <ResultsPage />
                )}
              </>
            ) : (
              <ElectionHistory />
            )}
          </div>
        )}
      </main>
      
      <footer className="h-12 bg-slate-100 border-t border-slate-200 px-8 flex items-center justify-between text-[11px] text-slate-500 mt-auto">
        <div className="flex gap-6">
          <span>Version 1.0.0</span>
          <span>Database: <span className="text-emerald-600 font-semibold">Connected</span></span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Web3Provider>
      <MainApp />
    </Web3Provider>
  );
}

