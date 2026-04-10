import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export const runtime = 'edge';

const TIER_CONFIG = {
  1: {
    bg: '#0A0918',
    stoneBg: '#1A1830',
    stoneBorder: '#2A2845',
    borderWidth: 1,
    textColor: '#9896A4',
    epitaphColor: '#5A5868',
    crossColor: '#3A3848',
    label: null,
    labelColor: null,
    accent: null,
    badgeBg: '#1A1830',
    badgeBorder: '#2A2845',
    badgeText: '#5A5868',
  },
  2: {
    bg: '#0D0B1E',
    stoneBg: '#1E1C35',
    stoneBorder: '#3A3660',
    borderWidth: 2,
    textColor: '#E8E4D8',
    epitaphColor: '#7A7888',
    crossColor: '#4A4860',
    label: null,
    labelColor: null,
    accent: null,
    badgeBg: '#1E1C35',
    badgeBorder: '#3A3660',
    badgeText: '#7A7888',
  },
  3: {
    bg: '#100E1F',
    stoneBg: '#1E1C30',
    stoneBorder: '#C8A96E',
    borderWidth: 3,
    textColor: '#F0EAD8',
    epitaphColor: '#C8A96E',
    crossColor: '#C8A96E',
    label: '✦ DELUXE ✦',
    labelColor: '#C8A96E',
    accent: '#C8A96E',
    badgeBg: 'rgba(200,169,110,0.15)',
    badgeBorder: '#C8A96E',
    badgeText: '#C8A96E',
  },
  4: {
    bg: '#080614',
    stoneBg: '#120F28',
    stoneBorder: '#6B5DB8',
    borderWidth: 4,
    textColor: '#F0EAD8',
    epitaphColor: '#A899D8',
    crossColor: '#6B5DB8',
    label: '👑 MAUSOLEUM',
    labelColor: '#A899D8',
    accent: '#6B5DB8',
    badgeBg: 'rgba(107,93,184,0.2)',
    badgeBorder: '#6B5DB8',
    badgeText: '#A899D8',
  },
} as const;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new Response('Missing token', { status: 400 });
  }

  const { data: grave } = await supabase
    .from('graves')
    .select('subject, epitaph, buried_by, tier, amount_paid, icon')
    .eq('share_token', token)
    .eq('status', 'approved')
    .single();

  if (!grave) {
    return new Response('Grave not found', { status: 404 });
  }

  const tier = (grave.tier ?? 2) as 1 | 2 | 3 | 4;
  const cfg = TIER_CONFIG[tier];
  const isMausoleum = tier === 4;
  const isDeluxe = tier === 3;

  const stoneW = isMausoleum ? 300 : isDeluxe ? 210 : 170;
  const stoneH = isMausoleum ? 380 : isDeluxe ? 250 : 210;
  const archR = Math.round(stoneW * 0.28);

  const subjectSize = isMausoleum ? 26 : isDeluxe ? 20 : 17;
  const epitaphSize = isMausoleum ? 16 : isDeluxe ? 13 : 11;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: cfg.bg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          position: 'relative',
        }}
      >
        {/* Tier-specific background glow for premium tiers */}
        {(isMausoleum || isDeluxe) && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: isMausoleum
                ? 'radial-gradient(circle, rgba(107,93,184,0.12) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(200,169,110,0.08) 0%, transparent 70%)',
              display: 'flex',
            }}
          />
        )}

        {/* Tombstone */}
        <div
          style={{
            width: `${stoneW}px`,
            height: `${stoneH}px`,
            background: cfg.stoneBg,
            border: `${cfg.borderWidth}px solid ${cfg.stoneBorder}`,
            borderRadius: `${archR}px ${archR}px 0 0`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '28px 20px 20px',
            marginBottom: '36px',
            position: 'relative',
          }}
        >
          {/* Tier label */}
          {cfg.label && (
            <div
              style={{
                color: cfg.labelColor!,
                fontSize: '10px',
                letterSpacing: '3px',
                marginBottom: '10px',
                display: 'flex',
              }}
            >
              {cfg.label}
            </div>
          )}

          {/* Icon */}
          {grave.icon && (
            <div style={{ fontSize: isMausoleum ? '36px' : isDeluxe ? '28px' : '24px', marginBottom: '8px', display: 'flex' }}>
              {grave.icon}
            </div>
          )}

          {/* Subject */}
          <div
            style={{
              color: cfg.textColor,
              fontSize: `${subjectSize}px`,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '10px',
              lineHeight: '1.3',
              display: 'flex',
            }}
          >
            {grave.subject}
          </div>

          {/* Cross */}
          <div style={{ color: cfg.crossColor, fontSize: isMausoleum ? '22px' : '16px', marginBottom: '10px', display: 'flex' }}>
            ✝
          </div>

          {/* Epitaph */}
          {grave.epitaph && (
            <div
              style={{
                color: cfg.epitaphColor,
                fontSize: `${epitaphSize}px`,
                textAlign: 'center',
                fontStyle: 'italic',
                lineHeight: '1.4',
                display: 'flex',
              }}
            >
              &ldquo;{grave.epitaph}&rdquo;
            </div>
          )}

          {/* Buried by */}
          {grave.buried_by && grave.buried_by !== 'Anonymous' && (
            <div
              style={{
                color: cfg.epitaphColor,
                fontSize: '9px',
                marginTop: '10px',
                letterSpacing: '1px',
                display: 'flex',
              }}
            >
              — {grave.buried_by}
            </div>
          )}
        </div>

        {/* Tier badge */}
        <div
          style={{
            background: cfg.badgeBg,
            border: `1px solid ${cfg.badgeBorder}`,
            color: cfg.badgeText,
            fontSize: '10px',
            letterSpacing: '2px',
            padding: '4px 14px',
            marginBottom: '16px',
            display: 'flex',
          }}
        >
          {tier === 1 ? 'A SHALLOW GRAVE · $1' : tier === 2 ? 'A PROPER BURIAL · $2' : tier === 3 ? 'DELUXE TOMBSTONE · $5' : 'THE MAUSOLEUM · $50'}
        </div>

        {/* Branding */}
        <div style={{ color: cfg.textColor, fontSize: '22px', fontWeight: 'bold', opacity: 0.7, display: 'flex' }}>
          bury.lol
        </div>
        <div style={{ color: cfg.epitaphColor, fontSize: '11px', marginTop: '4px', display: 'flex' }}>
          A final resting place for things the internet loved and lost.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
