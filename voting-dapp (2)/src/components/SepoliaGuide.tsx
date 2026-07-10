import React from 'react';

export const SepoliaGuide = () => {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto w-full">
      <h2 className="text-xl font-bold text-slate-900 mb-3">How to Get Free Sepolia Test ETH</h2>
      
      <p className="text-slate-600 text-sm leading-relaxed mb-6">
        Sepolia ETH is fake/test cryptocurrency with <strong>no real value</strong>. It is needed only to pay for the small "gas fees" required to perform blockchain transactions (like casting your vote). This is not real money and there is nothing you need to purchase.
      </p>

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">1</div>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">Install MetaMask</h4>
            <p className="text-sm text-slate-600 mt-1">Install the MetaMask browser extension from metamask.io, create a wallet, and securely save your recovery phrase.</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">2</div>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">Switch to Sepolia Network</h4>
            <p className="text-sm text-slate-600 mt-1">Open MetaMask, click the network dropdown at the top (if you don't see test networks, enable "Show test networks" in Settings {'>'} Advanced), and select "Sepolia".</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">3</div>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">Copy Your Address</h4>
            <p className="text-sm text-slate-600 mt-1">Click on your account name or address at the top of the MetaMask extension to copy your wallet address.</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">4</div>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">Visit a Faucet</h4>
            <p className="text-sm text-slate-600 mt-1">Go to a Sepolia faucet. We recommend trying these:</p>
            <ul className="list-disc ml-5 mt-2 text-sm text-slate-600 space-y-1">
              <li><strong>Google Cloud Web3 Sepolia Faucet</strong> (may require a free Google account)</li>
              <li><strong>Alchemy's Sepolia Faucet</strong> (may require a free Alchemy account)</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">5</div>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">Request Funds</h4>
            <p className="text-sm text-slate-600 mt-1">Paste your wallet address into the faucet's input field and request funds.</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">6</div>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">Check Balance</h4>
            <p className="text-sm text-slate-600 mt-1">Wait 1-5 minutes, then check your MetaMask. It should show a small amount of Sepolia ETH (usually 0.05–0.5 ETH).</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">7</div>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">Ready to Vote</h4>
            <p className="text-sm text-slate-600 mt-1">This ETH will be used automatically when you cast your vote later. No further action is needed—just make sure your balance isn't zero when voting opens.</p>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h4 className="font-bold text-amber-800 text-sm mb-1">Common Issues</h4>
        <p className="text-sm text-amber-700 leading-relaxed">
          Faucets sometimes have daily limits per address or IP address. If one faucet says it is empty or rate-limited, simply trying a different one usually works.
        </p>
      </div>
    </div>
  );
};
