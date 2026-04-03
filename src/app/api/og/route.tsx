import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new Response('Missing token', { status: 400 });
  }

  const { data: grave } = await supabase
    .from('graves')
    .select('subject, epitaph, buried_by, tier, amount_paid')
    .eq('share_token', token)
    .eq('status', 'approved')
    .single();

  if (!grave) {
    return new Response('Grave not found', { status: 404 });
  }

  const isMausoleum = grave.tier === 4;
  const isDeluxe = grave.tier === 3;

  // Tombstone dimensions scaled up for OG image
  const stoneW = isMausoleum ? 280 : isDeluxe ? 180 : 140;
  const stoneH = isMausoleum ? 360 : isDeluxe ? 220 : 180;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#111111',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
        }}
      >
        {/* Tombstone */}
        <div
          style={{
            width: `${stoneW}px`,
            height: `${stoneH}px`,
            background: '#2a2a28',
            border: `${isMausoleum ? '3px solid #3C3489' : isDeluxe ? '2px solid #888780' : '1px solid #444440'}`,
            borderRadius: `${stoneW * 0.25}px ${stoneW * 0.25}px 0 0`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            marginBottom: '40px',
          }}
        >
          {isMausoleum && (
            <div style={{ color: '#3C3489', fontSize: '11px', letterSpacing: '3px', marginBottom: '8px' }}>
              MAUSOLEUM
            </div>
          )}
          <div
            style={{
              color: '#F5F0E8',
              fontSize: isMausoleum ? '22px' : isDeluxe ? '16px' : '14px',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '8px',
            }}
          >
            {grave.subject}
          </div>
          <div style={{ color: '#555550', fontSize: isMausoleum ? '20px' : '14px', marginBottom: '8px' }}>
            ✝
          </div>
          {grave.epitaph && (
            <div
              style={{
                color: '#888780',
                fontSize: isMausoleum ? '13px' : '10px',
                textAlign: 'center',
                fontStyle: 'italic',
              }}
            >
              {grave.epitaph}
            </div>
          )}
        </div>

        {/* Tagline */}
        <div style={{ color: '#888780', fontSize: '18px', marginBottom: '8px' }}>
          A final resting place for things the internet loved and lost.
        </div>

        {/* Branding */}
        <div style={{ color: '#F5F0E8', fontSize: '28px', fontWeight: 'bold' }}>
          bury.lol
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
