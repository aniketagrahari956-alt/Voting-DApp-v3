import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BrowserProvider, Contract, Signer } from 'ethers';
import { getVotingContract } from '../contracts/VotingSystem';

interface Web3ContextType {
  provider: BrowserProvider | null;
  signer: Signer | null;
  contract: Contract | null;
  account: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isAdmin: boolean;
  currentPhase: number | null;
  currentElectionId: number | null;
  fetchPhase: () => Promise<void>;
  connectionError: string | null;
  clearError: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

const TARGET_CHAIN_ID = import.meta.env.VITE_CHAIN_ID ? parseInt(import.meta.env.VITE_CHAIN_ID, 10) : 11155111;

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [currentPhase, setCurrentPhase] = useState<number | null>(null);
  const [currentElectionId, setCurrentElectionId] = useState<number | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const isCorrectNetwork = chainId === TARGET_CHAIN_ID;

  const clearError = () => setConnectionError(null);

  const fetchPhase = async (cont?: Contract) => {
    const c = cont || contract;
    if (c) {
      try {
        const phase = await c.currentPhase();
        setCurrentPhase(Number(phase));
        
        try {
          const electionId = await c.currentElectionId();
          setCurrentElectionId(Number(electionId));
        } catch (err) {
          // Fallback if contract is not updated yet
          console.error("Failed to fetch electionId", err);
        }
      } catch (err) {
        console.error("Failed to fetch phase", err);
      }
    }
  };

  const connectWallet = async () => {
    if (isConnecting) return;
    setConnectionError(null);
    setIsConnecting(true);
    if (window.ethereum) {
      try {
        const _provider = new BrowserProvider(window.ethereum);
        const accounts = await _provider.send("eth_requestAccounts", []);
        const network = await _provider.getNetwork();
        const _signer = await _provider.getSigner();
        const _account = accounts[0];
        
        setProvider(_provider);
        setSigner(_signer);
        setAccount(_account);
        setChainId(Number(network.chainId));

        const _contract = getVotingContract(_signer);
        setContract(_contract);
        
        const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
        if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
          setConnectionError("Warning: VITE_CONTRACT_ADDRESS is not set. The app is pointing to a default null address. Please set this environment variable in your hosting platform (e.g. Netlify).");
          setIsConnecting(false);
          return;
        }

        if (Number(network.chainId) === TARGET_CHAIN_ID) {
          try {
            const adminStatus = await _contract.isAdmin(_account);
            setIsAdmin(adminStatus);
            await fetchPhase(_contract);
          } catch (e) {
            console.error("Contract call failed (isAdmin/currentPhase)", e);
          }
        } else {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x' + TARGET_CHAIN_ID.toString(16) }],
            });
          } catch (switchError) {
            console.error("Failed to switch network", switchError);
            setConnectionError("Please switch to the Sepolia network in your wallet.");
          }
        }
      } catch (err: any) {
        console.error("Failed to connect wallet", err);
        if (err.code === -32002 || (err.message && err.message.includes('already pending'))) {
          setConnectionError("A connection request is already pending in your wallet. Please open your wallet extension to accept it.");
        } else {
          setConnectionError(err.message || "Failed to connect wallet.");
        }
      } finally {
        setIsConnecting(false);
      }
    } else {
      setConnectionError("MetaMask not found. Please install MetaMask or open the app in a new tab if you're using an embedded preview.");
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setContract(null);
    setIsAdmin(false);
    setConnectionError(null);
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          connectWallet(); // Re-init
        } else {
          disconnectWallet();
        }
      });

      window.ethereum.on('chainChanged', (chainIdStr: string) => {
        setChainId(parseInt(chainIdStr, 16));
        connectWallet();
      });
    }
  }, []);

  return (
    <Web3Context.Provider value={{ provider, signer, contract, account, chainId, isCorrectNetwork, connectWallet, disconnectWallet, isAdmin, currentPhase, currentElectionId, fetchPhase, connectionError, clearError }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};
