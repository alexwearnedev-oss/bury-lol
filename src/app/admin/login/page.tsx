'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/admin');
      } else {
        setError('Wrong password. Even the afterlife has security.');
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center font-serif text-2xl font-bold text-cream">
          bury.lol / admin
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded border border-stone/30 bg-bg px-3 py-2 text-cream placeholder-stone/50 outline-none focus:border-cream/50"
          />
          {error && <p className="text-center text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-cream py-2.5 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
