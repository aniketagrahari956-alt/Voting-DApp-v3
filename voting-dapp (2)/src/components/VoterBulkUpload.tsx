import React, { useState, useRef } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { 
  Upload, FileText, CheckCircle2, AlertCircle, ExternalLink, 
  Loader2, Check, AlertTriangle, RefreshCw, Layers, Copy
} from 'lucide-react';
// @ts-ignore
import Papa from 'papaparse';
// @ts-ignore
import mammoth from 'mammoth';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

// Configure PDF.js worker
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@6.1.200/build/pdf.worker.min.mjs';

interface ParsedVoter {
  address: string;
  isRegistered: boolean;
  isChecking: boolean;
}

export const VoterBulkUpload = () => {
  const { contract, currentPhase } = useWeb3();
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  
  // Parsing results
  const [readyVoters, setReadyVoters] = useState<ParsedVoter[]>([]);
  const [alreadyRegistered, setAlreadyRegistered] = useState<string[]>([]);
  const [invalidAddresses, setInvalidAddresses] = useState<string[]>([]);
  const [totalFound, setTotalFound] = useState(0);

  // Chunking and registration states
  const [chunkSize, setChunkSize] = useState(100);
  const [autoChunk, setAutoChunk] = useState(true);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ethereum Address regexes
  const validRegex = /^0x[a-fA-F0-9]{40}$/i;
  // Matches potential hex strings starting with 0x (case-insensitive) of any length
  const potentialRegex = /0x[a-fA-F0-9]+/gi;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg(null);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['txt', 'csv', 'xlsx', 'xls', 'pdf', 'docx'];
    
    if (!extension || !allowedExtensions.includes(extension)) {
      setErrorMsg(`Unsupported file type (.${extension}). Please upload .txt, .csv, .xlsx, .xls, .pdf, or .docx files.`);
      return;
    }

    setFileName(file.name);
    setFileSize(formatBytes(file.size));
    setIsParsing(true);
    setParsingProgress('Reading file contents...');
    
    // Clear previous states
    setReadyVoters([]);
    setAlreadyRegistered([]);
    setInvalidAddresses([]);
    setTotalFound(0);
    setTxHash(null);

    try {
      let extractedText = '';
      let rawMatches: string[] = [];

      if (extension === 'txt') {
        extractedText = await readFileAsText(file);
        rawMatches = extractMatches(extractedText);
      } else if (extension === 'csv') {
        extractedText = await readFileAsText(file);
        rawMatches = parseCSVMatches(extractedText);
      } else if (extension === 'xlsx' || extension === 'xls') {
        rawMatches = await parseExcelMatches(file);
      } else if (extension === 'docx') {
        rawMatches = await parseDocxMatches(file);
      } else if (extension === 'pdf') {
        rawMatches = await parsePdfMatches(file);
      }

      if (rawMatches.length === 0) {
        throw new Error('No potential Ethereum wallet addresses found in this file.');
      }

      setParsingProgress(`Found ${rawMatches.length} raw matches. Processing and validating addresses...`);
      await validateAndFilterAddresses(rawMatches);
      
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while parsing the file. Please verify its format and try again.');
    } finally {
      setIsParsing(false);
    }
  };

  // 1. Helper to read file as plain text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  };

  // 2. Helper to extract raw matches via regex
  const extractMatches = (text: string): string[] => {
    return text.match(potentialRegex) || [];
  };

  // 3. Helper to parse CSV using PapaParse
  const parseCSVMatches = (csvText: string): string[] => {
    const results = Papa.parse(csvText, { skipEmptyLines: true });
    const matches: string[] = [];
    if (results.data && Array.isArray(results.data)) {
      results.data.forEach((row: any) => {
        if (Array.isArray(row)) {
          row.forEach((cell: any) => {
            const cellStr = String(cell || '').trim();
            const cellMatches = cellStr.match(potentialRegex);
            if (cellMatches) matches.push(...cellMatches);
          });
        }
      });
    }
    return matches;
  };

  // 4. Helper to parse Excel using SheetJS (XLSX)
  const parseExcelMatches = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const data = new Uint8Array(arrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const matches: string[] = [];
          
          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
            rows.forEach((row) => {
              if (Array.isArray(row)) {
                row.forEach((cell) => {
                  if (cell !== null && cell !== undefined) {
                    const cellMatches = String(cell).match(potentialRegex);
                    if (cellMatches) matches.push(...cellMatches);
                  }
                });
              }
            });
          });
          resolve(matches);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  // 5. Helper to parse Word documents using Mammoth
  const parseDocxMatches = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          const matches = result.value.match(potentialRegex) || [];
          resolve(matches);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  // 6. Helper to parse PDFs using pdfjs-dist
  const parsePdfMatches = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
          const pdf = await loadingTask.promise;
          const matches: string[] = [];
          
          for (let i = 1; i <= pdf.numPages; i++) {
            setParsingProgress(`Reading PDF page ${i} of ${pdf.numPages}...`);
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            textContent.items.forEach((item: any) => {
              if (item.str) {
                const itemMatches = item.str.match(potentialRegex);
                if (itemMatches) matches.push(...itemMatches);
              }
            });
          }
          resolve(matches);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  // 7. Core validation, deduplication and checking on-chain
  const validateAndFilterAddresses = async (matches: string[]) => {
    setTotalFound(matches.length);

    // Deduplicate valid addresses (case-insensitive key)
    const uniqueValidMap = new Map<string, string>();
    const malformed = new Set<string>();

    matches.forEach((m) => {
      const trimmed = m.trim();
      if (validRegex.test(trimmed)) {
        uniqueValidMap.set(trimmed.toLowerCase(), trimmed);
      } else {
        // Any word containing 0x but malformed
        if (trimmed.length > 2) {
          malformed.add(trimmed);
        }
      }
    });

    const validAddresses = Array.from(uniqueValidMap.values());
    setInvalidAddresses(Array.from(malformed));

    if (validAddresses.length === 0) {
      if (malformed.size > 0) {
        throw new Error('All potential addresses found in this file are malformed or invalid.');
      } else {
        throw new Error('No valid Ethereum addresses found.');
      }
    }

    setParsingProgress(`Verifying registration status for ${validAddresses.length} unique addresses on-chain...`);

    // Verify on-chain status in parallel batches of 20
    const readyList: ParsedVoter[] = [];
    const registeredList: string[] = [];
    const batchSize = 20;

    for (let i = 0; i < validAddresses.length; i += batchSize) {
      const currentBatch = validAddresses.slice(i, i + batchSize);
      setParsingProgress(`Verifying status on-chain: ${Math.min(i + batchSize, validAddresses.length)} / ${validAddresses.length}...`);
      
      const batchPromises = currentBatch.map(async (address) => {
        try {
          if (contract) {
            const status = await contract.getVoterStatus(address);
            if (status.isRegistered) {
              registeredList.push(address);
            } else {
              readyList.push({ address, isRegistered: false, isChecking: false });
            }
          } else {
            // fallback if contract is not available
            readyList.push({ address, isRegistered: false, isChecking: false });
          }
        } catch (e) {
          console.error(`Failed to verify status for ${address}`, e);
          readyList.push({ address, isRegistered: false, isChecking: false });
        }
      });

      await Promise.all(batchPromises);
    }

    setReadyVoters(readyList);
    setAlreadyRegistered(registeredList);
  };

  const getBatches = () => {
    const addresses = readyVoters.map(v => v.address);
    if (!autoChunk) {
      return [addresses];
    }
    const chunked: string[][] = [];
    for (let i = 0; i < addresses.length; i += chunkSize) {
      chunked.push(addresses.slice(i, i + chunkSize));
    }
    return chunked;
  };

  const batches = getBatches();
  const currentBatch = batches[currentBatchIndex] || [];

  const handleRegisterBatch = async () => {
    if (!contract || currentBatch.length === 0) return;
    setIsRegistering(true);
    setTxHash(null);
    setErrorMsg(null);

    try {
      const tx = await contract.registerVotersBatch(currentBatch);
      setParsingProgress('Waiting for transaction mining...');
      await tx.wait();
      setTxHash(tx.hash);
      
      // Save manually to MongoDB audit log (optional enhancement)
      try {
        await fetch('/api/audit-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventName: 'VoterBulkRegistration',
            txHash: tx.hash,
            blockNumber: tx.blockNumber || 0,
            data: {
              addressesCount: currentBatch.length,
              addresses: currentBatch,
              fileName: fileName
            }
          })
        });
      } catch (err) {
        console.warn('Failed to post optional local audit-log, but transaction succeeded.', err);
      }

      // Remove registered addresses from readyVoters
      const registeredSet = new Set(currentBatch.map(a => a.toLowerCase()));
      setReadyVoters(prev => prev.filter(v => !registeredSet.has(v.address.toLowerCase())));
      
      // Add them to already registered
      setAlreadyRegistered(prev => [...prev, ...currentBatch]);

      if (currentBatchIndex >= batches.length - 1) {
        setCurrentBatchIndex(0);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.reason || err.message || 'Transaction failed. Please make sure you have admin rights and sufficient gas.');
    } finally {
      setIsRegistering(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Bulk Voter Upload
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Register multiple voter wallet addresses by uploading files. All file parsing occurs completely inside your browser.
          </p>
        </div>
      </div>

      {currentPhase !== 0 ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          <div className="text-xs">
            <p className="font-semibold">Bulk Upload Disabled</p>
            <p className="mt-0.5 text-slate-600">Voters can only be registered during the Preparation phase (Phase 0).</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File input selection & drop zone */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' 
                : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt,.csv,.xlsx,.xls,.pdf,.docx"
              className="hidden" 
            />
            
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
              <Upload className="w-6 h-6 text-indigo-600" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              Drag & drop voter files here, or <span className="text-indigo-600 underline">browse files</span>
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Supports: Plain Text (.txt), Comma-Separated (.csv), Excel (.xlsx, .xls), Word (.docx), and PDF (.pdf)
            </p>
          </div>

          {/* Loader Parsing State */}
          {isParsing && (
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-800">Processing Document...</p>
              <p className="text-xs text-slate-500 mt-1">{parsingProgress}</p>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
              <XCircleIcon className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-700">Upload Error</p>
                <p className="text-sm mt-1">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Success / Tx Feedback */}
          {txHash && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3 shadow-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <div className="flex-1 text-sm">
                <p className="font-bold text-emerald-900">Voters Registered Successfully!</p>
                <p className="text-xs text-slate-600 mt-1">The batch has been processed and committed on-chain.</p>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${txHash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 underline hover:text-emerald-900 mt-2"
                >
                  View Transaction on Etherscan <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* KPI Dashboard Grid */}
          {totalFound > 0 && !isParsing && (
            <div className="space-y-6">
              {/* File Info Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">{fileName}</p>
                    <p className="text-[10px] text-slate-400">{fileSize}</p>
                  </div>
                </div>
                <div className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  Analyzed Completely
                </div>
              </div>

              {/* KPI metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Found</span>
                  <span className="text-xl font-bold text-slate-800">{totalFound}</span>
                </div>
                
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-1">Ready</span>
                  <span className="text-xl font-bold text-indigo-800">{readyVoters.length}</span>
                </div>

                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block mb-1">On-Chain</span>
                  <span className="text-xl font-bold text-emerald-800">{alreadyRegistered.length}</span>
                </div>

                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block mb-1">Skipped</span>
                  <span className="text-xl font-bold text-amber-800">{invalidAddresses.length}</span>
                </div>
              </div>

              {/* Detailed Lists Accordion/Tabs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Ready to Register (Valid, Unregistered) */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-[280px]">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                      Voters Ready ({readyVoters.length})
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {readyVoters.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                        No additional voters ready for registration.
                      </div>
                    ) : (
                      readyVoters.map((item, index) => (
                        <div key={item.address} className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded border border-slate-150 text-[11px] font-mono">
                          <span className="text-slate-500 mr-2">{index + 1}.</span>
                          <span className="text-slate-700 select-all flex-1 truncate">{item.address}</span>
                          <button 
                            onClick={() => copyToClipboard(item.address, index)} 
                            className="text-slate-400 hover:text-slate-600 p-1"
                            title="Copy address"
                          >
                            {copiedIndex === index ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Already registered or malformed lists combined */}
                <div className="space-y-4">
                  {/* Skipped Already Registered list */}
                  {alreadyRegistered.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-[130px]">
                      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          Already Registered ({alreadyRegistered.length})
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                        {alreadyRegistered.map((addr, idx) => (
                          <div key={addr} className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">{addr}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skipped Malformed list */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-[130px]">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        Skipped/Invalid ({invalidAddresses.length})
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                      {invalidAddresses.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                          No invalid addresses detected.
                        </div>
                      ) : (
                        invalidAddresses.map((addr) => (
                          <div key={addr} className="flex items-start gap-1.5 text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-1 rounded">
                            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                            <span className="truncate select-all flex-1">{addr}</span>
                            <span className="text-[8px] bg-amber-100 text-amber-800 font-bold px-1 rounded">Malformed</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Action and Chunking Configuration Area */}
              {readyVoters.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="autoChunk" 
                          checked={autoChunk} 
                          onChange={(e) => setAutoChunk(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="autoChunk" className="text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer">
                          Enable gas-safe chunked submission
                        </label>
                      </div>
                      
                      {autoChunk && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">Voters per transaction:</span>
                          <select 
                            value={chunkSize} 
                            onChange={(e) => setChunkSize(Number(e.target.value))}
                            className="border border-slate-200 bg-white rounded px-2 py-0.5 text-xs text-slate-600 outline-none focus:ring-1 focus:ring-indigo-300"
                          >
                            <option value={50}>50</option>
                            <option value={100}>100 (Recommended)</option>
                            <option value={150}>150</option>
                            <option value={200}>200</option>
                          </select>
                        </div>
                      )}

                      {/* Gas Limit Warn banner */}
                      {readyVoters.length > 150 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2 text-xs text-amber-800">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <p>
                            <strong>Large Batch Warning:</strong> Registering {readyVoters.length} addresses in a single block might hit Ethereum gas limits. Auto-chunking has been enabled to submit in smaller, safe transaction batches.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      {autoChunk && batches.length > 1 && (
                        <div className="text-xs font-semibold text-slate-500">
                          Batch {currentBatchIndex + 1} of {batches.length} ({currentBatch.length} voters)
                        </div>
                      )}
                      
                      <button 
                        onClick={handleRegisterBatch}
                        disabled={isRegistering || currentBatch.length === 0}
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-150 transition-all text-sm flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
                      >
                        {isRegistering ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Registering Batch...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            {autoChunk && batches.length > 1 
                              ? `Register Batch ${currentBatchIndex + 1} (${currentBatch.length})` 
                              : `Register ${readyVoters.length} Voters`
                            }
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Multi-Batch Selector Navigation */}
                  {autoChunk && batches.length > 1 && (
                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Select batch to submit:</span>
                      <div className="flex items-center gap-1.5">
                        {batches.map((batch, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentBatchIndex(idx)}
                            disabled={isRegistering}
                            className={`px-2.5 py-1 rounded-md font-bold text-[10px] transition-all border ${
                              currentBatchIndex === idx 
                                ? 'bg-indigo-600 border-indigo-600 text-white' 
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            Batch {idx + 1} ({batch.length})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Simple standalone icon since lucide-react name is different or custom
const XCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
);
