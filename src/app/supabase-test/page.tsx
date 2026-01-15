
'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function SupabaseTestPage() {
  const [status, setStatus] = useState<string>('Testing connection...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkConnection() {
      try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          throw new Error('Missing environment variables');
        }

        // Just checking if we can create a query builder,
        // effectively checking if the client initialized.
        // A real network check would happen on .then()

        // Let's try to get the session, which is a safe read operation
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        setStatus('Connection successful! Supabase client is initialized.');
        console.log('Supabase session data:', data);

      } catch (err: any) {
        setStatus('Connection failed');
        setError(err.message || 'Unknown error');
      }
    }

    checkConnection();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>

      <div className={`p-4 rounded-md ${error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
        <p className="font-semibold">{status}</p>
        {error && <p className="mt-2 text-sm">{error}</p>}
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Environment Configuration</h2>
        <div className="bg-gray-100 p-4 rounded text-sm font-mono">
          <p>
            URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configured' : '❌ Missing'}
          </p>
          <p>
            Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configured' : '❌ Missing'}
          </p>
        </div>
      </div>
    </div>
  );
}
