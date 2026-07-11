import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { SepoliaGuide } from './SepoliaGuide';

export const ApplyToVote = () => {
  const { account } = useWeb3();
  const [fullName, setFullName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (account) {
      checkStatus();
    }
  }, [account]);

  const checkStatus = async () => {
    try {
      const res = await fetch(`/api/voter-requests/${account}`);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.status === 'pending' || data.status === 'approved')) {
          setStatus(data.status);
        } else {
          setStatus('none');
        }
      } else {
        setStatus('none');
      }
    } catch (e) {
      console.error(e);
      setStatus('none');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setErrorMsg('');
    if (selected) {
      if (selected.size > 2 * 1024 * 1024) {
        setErrorMsg('File size must be less than 2MB');
        setFile(null);
        e.target.value = '';
        return;
      }
      setFile(selected);
    }
  };

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !fullName || !file) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const base64Full = await toBase64(file);
      // Data URL format: data:image/png;base64,iVBORw0KGgo...
      const match = base64Full.match(/^data:(.*);base64,(.*)$/);
      let identityProofBase64 = base64Full;
      let identityProofMimeType = file.type || 'application/octet-stream';
      
      if (match) {
        identityProofMimeType = match[1];
        identityProofBase64 = match[2];
      }

      const res = await fetch('/api/voter-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: account,
          fullName,
          identityProofBase64,
          identityProofMimeType
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit application');
      }

      setStatus('pending');
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'pending') {
    return (
      <div className="w-full flex flex-col gap-6">
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 p-8 rounded-2xl flex flex-col items-center justify-center shadow-sm text-center">
          <Loader2 className="w-12 h-12 shrink-0 mb-4 animate-spin text-indigo-500" />
          <h3 className="font-bold text-xl">Application Pending</h3>
          <p className="mt-2 text-indigo-700 max-w-md">Your application has been submitted and is currently pending admin approval. Please check back later.</p>
        </div>
        <SepoliaGuide />
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="w-full flex flex-col gap-6">
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-8 rounded-2xl flex flex-col items-center justify-center shadow-sm text-center">
          <CheckCircle2 className="w-12 h-12 shrink-0 mb-4 text-emerald-500" />
          <h3 className="font-bold text-xl">Application Approved</h3>
          <p className="mt-2 text-emerald-700 max-w-md">Your application has been approved. You should now be registered to vote. If you still see this screen, please refresh the page or wait for the transaction to confirm.</p>
        </div>
        <SepoliaGuide />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-8">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Apply to Vote</h2>
        <p className="text-slate-600 mb-6">Submit your details to request voting access from the administrator.</p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMsg && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Wallet Address</label>
            <input 
              type="text" 
              value={account || ''} 
              readOnly 
              className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-500 font-mono text-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="e.g. Jane Doe"
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Identity Proof</label>
            <p className="text-xs text-slate-500 mb-2">Upload a photo of your ID (JPEG, PNG, PDF). Max 2MB.</p>
            <div className="flex items-center gap-3">
              <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-all">
                <Upload className="w-4 h-4" />
                Choose File
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".jpg,.jpeg,.png,.pdf" 
                  onChange={handleFileChange}
                  required
                />
              </label>
              {file && <span className="text-sm text-slate-600 truncate max-w-[200px]">{file.name}</span>}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || !file || !fullName}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all disabled:bg-indigo-400 flex justify-center items-center gap-2 mt-4"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Application'
            )}
          </button>
        </form>
      </div>

      <SepoliaGuide />
    </div>
  );
};
