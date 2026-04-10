'use client';

import { useState } from 'react';
import type { Grave } from '@/lib/types';

type GraveWithIp = Grave & { ip_hash: string };

interface Props {
  pending: GraveWithIp[];
  reported: GraveWithIp[];
  counts: {
    pending: number;
    approved: number;
    rejected: number;
    revenue: number;
  };
}

const TIER_NAMES: Record<number, string> = {
  1: 'Shallow $1',
  2: 'Proper $2',
  3: 'Deluxe $5',
  4: 'Mausoleum $50',
};

function GraveCard({
  grave,
  onApprove,
  onReject,
}: {
  grave: GraveWithIp;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);

  const handleApprove = async () => {
    setLoading(true);
    await onApprove(grave.id);
    setDone('approved');
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    await onReject(grave.id, reason);
    setDone('rejected');
    setLoading(false);
  };

  if (done) {
    return (
      <div className={`rounded border px-4 py-3 text-sm ${done === 'approved' ? 'border-moss/40 bg-moss/5 text-moss' : 'border-red-900/40 bg-red-950/20 text-red-400'}`}>
        {done === 'approved' ? '✓ Approved' : '✕ Rejected'} — {grave.subject}
      </div>
    );
  }

  return (
    <div className="rounded border border-stone/20 bg-black/20 p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-cream">{grave.subject}</span>
            <span className="rounded bg-stone/20 px-1.5 py-0.5 text-xs text-stone">
              {TIER_NAMES[grave.tier]}
            </span>
          </div>
          {grave.epitaph && (
            <p className="mt-1 text-sm italic text-stone">&ldquo;{grave.epitaph}&rdquo;</p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-stone/60">
            <span>by {grave.buried_by}</span>
            <span>{new Date(grave.created_at).toLocaleString()}</span>
            <span>IP: {grave.ip_hash}</span>
            {grave.report_count > 0 && (
              <span className="text-red-400">{grave.report_count} reports</span>
            )}
          </div>
        </div>
      </div>

      {!rejectMode ? (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="rounded border border-moss/50 bg-moss/10 px-3 py-1.5 text-xs text-moss transition-colors hover:bg-moss/20 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => setRejectMode(true)}
            disabled={loading}
            className="rounded border border-red-900/50 bg-red-950/20 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-950/40 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Rejection reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="flex-1 rounded border border-stone/30 bg-bg px-2 py-1.5 text-xs text-cream placeholder-stone/50 outline-none"
          />
          <button
            onClick={handleReject}
            disabled={loading}
            className="rounded border border-red-900/50 bg-red-950/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/40 disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            onClick={() => setRejectMode(false)}
            className="rounded border border-stone/20 px-3 py-1.5 text-xs text-stone hover:border-stone/40"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard({ pending, reported, counts }: Props) {
  const [tab, setTab] = useState<'pending' | 'reported'>('pending');

  const callApprove = async (id: string, action: 'approve' | 'reject', reason?: string) => {
    await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, reason }),
    });
  };

  const handleLogout = async () => {
    await fetch('/api/admin-logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-serif text-2xl font-bold text-cream">bury.lol admin</h1>
          <div className="flex items-center gap-4">
            <a href="/" className="text-xs text-stone hover:text-cream">← back to site</a>
            <button
              onClick={handleLogout}
              className="text-xs text-stone hover:text-red-400"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Pending', value: counts.pending, color: 'text-yellow-400' },
            { label: 'Approved', value: counts.approved, color: 'text-moss' },
            { label: 'Rejected', value: counts.rejected, color: 'text-red-400' },
            { label: 'Revenue', value: `$${Math.floor(counts.revenue / 100)}`, color: 'text-cream' },
          ].map((s) => (
            <div key={s.label} className="rounded border border-stone/20 p-3 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-stone">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 border-b border-stone/20">
          {(['pending', 'reported'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm transition-colors ${
                tab === t
                  ? 'border-b-2 border-cream text-cream'
                  : 'text-stone hover:text-cream'
              }`}
            >
              {t === 'pending' ? `Pending (${counts.pending})` : `Reported (${reported.length})`}
            </button>
          ))}
        </div>

        {/* Pending queue */}
        {tab === 'pending' && (
          <div className="space-y-3">
            {pending.length === 0 ? (
              <p className="py-8 text-center text-stone">All clear. Nothing to review.</p>
            ) : (
              pending.map((grave) => (
                <GraveCard
                  key={grave.id}
                  grave={grave}
                  onApprove={(id) => callApprove(id, 'approve')}
                  onReject={(id, reason) => callApprove(id, 'reject', reason)}
                />
              ))
            )}
          </div>
        )}

        {/* Reported tab */}
        {tab === 'reported' && (
          <div className="space-y-3">
            {reported.length === 0 ? (
              <p className="py-8 text-center text-stone">No reported graves.</p>
            ) : (
              reported.map((grave) => (
                <GraveCard
                  key={grave.id}
                  grave={grave}
                  onApprove={(id) => callApprove(id, 'approve')}
                  onReject={(id, reason) => callApprove(id, 'reject', reason)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
