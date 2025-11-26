'use client';

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = '0x59eddd626b56b87be2673bdfa42d1cf5a2fa4703752781b9e2bb4ff623d218ec';

export default function DebugPage() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [profileId, setProfileId] = useState('');

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleCreateProfile = async () => {
    setLogs([]);
    addLog('🚀 Starting create profile...');
    
    if (!account) {
      addLog('❌ No account connected');
      alert('Please connect wallet first!');
      return;
    }
    
    addLog(`✅ Account connected: ${account.address}`);
    setLoading(true);

    try {
      addLog('📝 Creating transaction...');
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::treasure_box::create_profile`,
      });
      
      addLog('✅ Transaction created');
      addLog('💼 Requesting wallet signature...');

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            addLog('🎉 Transaction successful!');
            addLog(`Digest: ${result.digest}`);
            
            const created = result.effects?.created;
            if (created && created.length > 0) {
              const newProfileId = created[0].reference.objectId;
              addLog(`✅ Profile created: ${newProfileId}`);
              setProfileId(newProfileId);
            } else {
              addLog('⚠️ No objects created in transaction');
            }
            
            setLoading(false);
          },
          onError: (error) => {
            addLog(`❌ Transaction failed: ${error.message}`);
            setLoading(false);
          },
        }
      );
      
      addLog('⏳ Waiting for wallet confirmation...');
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      setLoading(false);
    }
  };

  const checkBalance = async () => {
    if (!account) {
      addLog('❌ No account connected');
      return;
    }
    
    try {
      addLog('💰 Checking balance...');
      const balance = await client.getBalance({
        owner: account.address,
      });
      addLog(`Balance: ${Number(balance.totalBalance) / 1_000_000_000} SUI`);
    } catch (error: any) {
      addLog(`❌ Error checking balance: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">🐛 Debug Page</h1>
        
        {/* Account Info */}
        <div className="bg-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Account Info</h2>
          <div className="space-y-2 text-white">
            <p><strong>Connected:</strong> {account ? 'Yes ✅' : 'No ❌'}</p>
            {account && (
              <>
                <p><strong>Address:</strong> <span className="font-mono text-sm break-all">{account.address}</span></p>
                <p><strong>Package ID:</strong> <span className="font-mono text-sm break-all">{PACKAGE_ID}</span></p>
              </>
            )}
            {profileId && (
              <p><strong>Profile ID:</strong> <span className="font-mono text-sm break-all text-green-400">{profileId}</span></p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Actions</h2>
          <div className="space-y-4">
            <button
              onClick={checkBalance}
              className="w-full bg-blue-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600"
            >
              Check Balance
            </button>
            
            <button
              onClick={handleCreateProfile}
              disabled={loading || !account}
              className="w-full bg-green-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Processing...' : '🎮 Create Profile'}
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-black/50 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Console Logs</h2>
          <div className="space-y-1 font-mono text-sm max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-400">No logs yet...</p>
            ) : (
              logs.map((log, i) => (
                <p key={i} className="text-green-400">{log}</p>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-blue-400 hover:text-blue-300 underline">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
