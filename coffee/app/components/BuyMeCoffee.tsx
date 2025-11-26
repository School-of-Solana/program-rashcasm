'use client';

import React, { useState } from 'react';
import { Coffee, Send, Wallet } from 'lucide-react';
import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@project-serum/anchor';
import IDL from './ancproject.json';

const PROGRAM_ID = new PublicKey('4K6LtuL5hK9FGADBNgiw5cXyk3RPPz3LeLwq7M8xUzUS');
const CREATOR_ADDRESS = new PublicKey('GsJYonU5Kz4MJBHZ5UFx9oyStBpXXswnZcFUorktj2yZ');
const NETWORK = 'https://api.devnet.solana.com'; // Change to mainnet-beta for production

export default function BuyMeCoffee() {
  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState('');
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).solana && (window as any).solana.isPhantom) {
        const response = await (window as any).solana.connect();
        const address = response.publicKey.toString();
        setWalletAddress(address.slice(0, 4) + '...' + address.slice(-4));
        setConnected(true);
        
        // Setup provider and program
        const connection = new Connection(NETWORK, 'confirmed');
        const wallet = (window as any).solana;
        const anchorProvider = new AnchorProvider(connection, wallet, {
          preflightCommitment: 'confirmed',
        });
        setProvider(anchorProvider);
        
        const anchorProgram = new Program(IDL as any, PROGRAM_ID, anchorProvider);
        setProgram(anchorProgram);
        
        // Load tip history
        await loadTipHistory(anchorProgram);
      } else {
        alert('Please install Phantom wallet to use this app');
      }
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      alert('Failed to connect wallet: ' + err.message);
    }
  };

  const loadTipHistory = async (anchorProgram: any) => {
    try {
      const programAccounts = await anchorProgram.account.tipHistory.all();
      const tips = programAccounts.map((account: any) => ({
        tipper: account.account.tipper.toString().slice(0, 4) + '...' + account.account.tipper.toString().slice(-4),
        amount: account.account.amount.toNumber() / LAMPORTS_PER_SOL,
        message: account.account.message,
        timestamp: account.account.timestamp.toNumber() * 1000
      }));
      
      tips.sort((a: any, b: any) => b.timestamp - a.timestamp);
      setHistory(tips);
    } catch (err) {
      console.error('Failed to load tip history:', err);
    }
  };

  const handleSendTip = async () => {
    if (!connected || !program) {
      alert('Please connect your wallet first');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }

    setLoading(true);
    
    try {
      const amountLamports = new BN(parseFloat(amount) * LAMPORTS_PER_SOL);
      const timestamp = new BN(Math.floor(Date.now() / 1000));
      
      // Derive PDA for tip history
      const [tipHistoryPDA] = await PublicKey.findProgramAddress(
        [
          Buffer.from('tip_history'),
          (window as any).solana.publicKey.toBuffer(),
          timestamp.toBuffer('be', 8)
        ],
        PROGRAM_ID
      );

      // Send transaction
      const tx = await program.methods
        .tip(amountLamports, message, timestamp)
        .accounts({
          tipper: (window as any).solana.publicKey,
          creator: CREATOR_ADDRESS,
          tip_history: tipHistoryPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Transaction signature:', tx);
      
      // Wait for confirmation
      await provider.connection.confirmTransaction(tx);
      
      alert('Tip sent successfully! 🎉');
      
      // Reload history
      await loadTipHistory(program);
      
      // Clear form
      setMessage('');
      setAmount('');
    } catch (err: any) {
      console.error('Failed to send tip:', err);
      alert('Failed to send tip: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const now = new Date().getTime();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Coffee className="w-12 h-12 text-yellow-300" />
            <h1 className="text-4xl font-bold text-white">Buy Me a Coffee</h1>
          </div>
          <p className="text-purple-200">Support creators with SOL ☕</p>
          
          {/* Wallet Connection */}
          <div className="mt-6">
            {!connected ? (
              <button
                onClick={connectWallet}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto transition-colors"
              >
                <Wallet className="w-5 h-5" />
                Connect Wallet
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg">
                <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                Connected: {walletAddress}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Side - Send Tip Form */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Send a Tip</h2>
            
            <div className="space-y-6">
              {/* Message Input */}
              <div>
                <label className="block text-purple-200 mb-2 font-medium">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Say something nice..."
                  className="w-full bg-white/5 border border-purple-400/30 rounded-lg px-4 py-3 text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 resize-none"
                  rows={4}
                  maxLength={200}
                />
                <div className="text-right text-purple-300 text-sm mt-1">
                  {message.length}/200
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-purple-200 mb-2 font-medium">
                  Amount (SOL)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full bg-white/5 border border-purple-400/30 rounded-lg px-4 py-3 text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-300 font-semibold">
                    SOL
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  {[0.1, 0.5, 1.0, 2.0].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset.toString())}
                      className="flex-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {preset} SOL
                    </button>
                  ))}
                </div>
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendTip}
                disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Tip
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Side - Tip History */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Recent Tips</h2>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {history.length === 0 ? (
                <div className="text-center text-purple-300 py-8">
                  <Coffee className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No tips yet. Be the first to support!</p>
                </div>
              ) : (
                history.map((tip, index) => (
                  <div
                    key={index}
                    className="bg-white/5 border border-purple-400/20 rounded-lg p-4 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {tip.tipper.charAt(0)}
                        </div>
                        <div>
                          <div className="text-purple-200 font-mono text-sm">
                            {tip.tipper}
                          </div>
                          <div className="text-purple-400 text-xs">
                            {formatTime(tip.timestamp)}
                          </div>
                        </div>
                      </div>
                      <div className="bg-yellow-400/20 text-yellow-300 px-3 py-1 rounded-full font-bold text-sm">
                        {tip.amount} SOL
                      </div>
                    </div>
                    <p className="text-white text-sm mt-2 pl-10">
                      {tip.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8 text-purple-300 text-sm">
          <p>🌐 Connected to: {NETWORK.includes('devnet') ? 'Devnet' : 'Mainnet'}</p>
          <p className="mt-1">💰 Tips go to: {CREATOR_ADDRESS.toString().slice(0, 8)}...{CREATOR_ADDRESS.toString().slice(-8)}</p>
        </div>
      </div>
    </div>
  );
}