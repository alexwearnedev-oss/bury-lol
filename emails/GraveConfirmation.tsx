import * as React from 'react';

interface GraveConfirmationEmailProps {
  subject: string;
  epitaph?: string;
  tier: number;
  shareUrl: string;
  amount: number; // in cents
}

export default function GraveConfirmationEmail({
  subject,
  epitaph,
  tier,
  shareUrl,
  amount,
}: GraveConfirmationEmailProps) {
  const isMausoleum = tier === 4;
  const displayAmount = `$${(amount / 100).toFixed(0)}`;

  return (
    <div
      style={{
        backgroundColor: '#111111',
        color: '#F5F0E8',
        fontFamily: 'Courier New, monospace',
        padding: '40px 20px',
        textAlign: 'center' as const,
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          margin: '0 auto',
        }}
      >
        {/* Logo */}
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            marginBottom: '32px',
            letterSpacing: '-0.5px',
          }}
        >
          bury.lol
        </h1>

        {/* Tombstone illustration */}
        <div
          style={{
            backgroundColor: '#2a2a28',
            border: isMausoleum ? '2px solid #3C3489' : '1px solid #444440',
            borderRadius: '8px 8px 0 0',
            padding: '32px 24px',
            margin: '0 auto 24px',
            maxWidth: '280px',
          }}
        >
          <div
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              marginBottom: '8px',
            }}
          >
            RIP
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '8px',
            }}
          >
            {subject}
          </div>
          {epitaph && (
            <div
              style={{
                fontSize: '13px',
                color: '#888780',
                fontStyle: 'italic',
              }}
            >
              &ldquo;{epitaph}&rdquo;
            </div>
          )}
          <div
            style={{
              fontSize: '14px',
              color: '#555550',
              marginTop: '12px',
            }}
          >
            &#x271D;
          </div>
        </div>

        {/* Message */}
        <p style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '8px' }}>
          {isMausoleum
            ? `A mausoleum. Truly, you loved ${subject} more than anyone deserved to.`
            : `Rest easy, ${subject}. You deserved better.`}
        </p>

        <p
          style={{
            fontSize: '13px',
            color: '#888780',
            marginBottom: '24px',
          }}
        >
          Your grave is currently being reviewed. It&apos;ll be live within 24 hours.
        </p>

        <p
          style={{
            fontSize: '12px',
            color: '#555550',
            marginBottom: '24px',
          }}
        >
          Burial fee: {displayAmount}
        </p>

        {/* CTA Button */}
        <a
          href={shareUrl}
          style={{
            display: 'inline-block',
            backgroundColor: '#F5F0E8',
            color: '#111111',
            padding: '12px 28px',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 'bold',
            fontFamily: 'Courier New, monospace',
          }}
        >
          Visit the grave &rarr;
        </a>

        {/* Footer */}
        <p
          style={{
            fontSize: '11px',
            color: '#555550',
            marginTop: '40px',
          }}
        >
          Made by the internet, for the internet.
        </p>
      </div>
    </div>
  );
}
