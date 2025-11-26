'use client';

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = '0x59eddd626b56b87be2673bdfa42d1cf5a2fa4703752781b9e2bb4ff623d218ec';

export default function TestPage() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleTest = () => {
    console.log('Button clicked!');
    console.log('Account:', account);
    
    if (!account) {
      setResult('No account connected');
      return;
    }

    setLoading(true);
    setResult('Creating transaction...');

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::treasure_box::create_profile`,
      });

      console.log('Signing transaction...');
      
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Success:', result);
            setResult(`Success! ${JSON.stringify(result.effects?.created?.[0])}`);
            setLoading(false);
          },
          onError: (error) => {
            console.error('Error:', error);
            setResult(`Error: ${error.message}`);
            setLoading(false);
          },
        }
      );
    } catch (error: any) {
      console.error('Catch error:', error);
      setResult(`Catch Error: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Test Page</h1>
        
        <div className="bg-white/10 rounded-xl p-6 mb-4">
          <p className="text-white mb-2">Account: {account?.address || 'Not connected'}</p>
          <p className="text-white mb-2">Loading: {loading ? 'Yes' : 'No'}</p>
        </div>

        <button
          onClick={handleTest}
          disabled={loading || !account}
          className="w-full bg-blue-500 text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Test Create Profile'}
        </button>

        {result && (
          <div className="mt-4 bg-white/10 rounded-xl p-6">
            <p className="text-white break-all">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
}
