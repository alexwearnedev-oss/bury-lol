'use client';

import { useState, useMemo } from 'react';

export const EMOJI_CATEGORIES: Record<string, string[]> = {
  'Dead Tech': [
    '📱','💾','💿','📼','📺','🖥️','💻','📟','📠','☎️','🎮','🕹️',
    '📡','📷','📹','🖨️','⌨️','🖱️','📀','📻','📠','🔋','💡','📞',
  ],
  'Social & Apps': [
    '🐦','📸','💬','📧','🔗','📰','🌐','🔔','❤️','👍','🤳','📲',
    '💌','📣','📢','🔖','🏷️','💯','🔥','⚡',
  ],
  'Music & Media': [
    '🎵','🎶','🎸','🎹','🎤','🎧','🎷','🎺','🥁','🎻','🎬','🎞️',
    '📽️','🎼','🎙️','🎚️','🎛️','🎯','🎪','🎭',
  ],
  'Memes & Culture': [
    '🐸','🦆','🦋','👻','💀','☠️','🌈','😂','🤔','😤','🤣','😭',
    '🙏','👀','🤦','🤷','💅','🧠','🫡','🫠',
  ],
  'Nature & Space': [
    '🌙','⭐','🌟','💫','🌍','🚀','🛸','🌺','🌸','🍀','🌿','🍁',
    '🦇','🕷️','🌊','☁️','⛅','🌪️','❄️','🔮',
  ],
  'Vibes & Feelings': [
    '💔','🥀','😴','💤','💸','🎲','👑','🏆','💎','🗝️','⚔️','🛡️',
    '🎰','🧿','🪬','🕯️','⚰️','🪦','🫀','🧬',
  ],
};

const ALL_EMOJI = Object.values(EMOJI_CATEGORIES).flat();

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export default function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [search, setSearch]   = useState('');
  const [activeTab, setActiveTab] = useState<string>(Object.keys(EMOJI_CATEGORIES)[0]);
  const [custom, setCustom]   = useState('');

  const filtered = useMemo(() => {
    if (!search) return null;
    // Simple filter: show all emoji (we can't text-search emoji chars, so just show all when typing)
    return ALL_EMOJI;
  }, [search]);

  const displayEmoji = filtered ?? EMOJI_CATEGORIES[activeTab] ?? [];

  const handleCustomSubmit = () => {
    const trimmed = custom.trim();
    if (!trimmed) return;
    // Take first emoji-like character
    const char = Array.from(trimmed)[0];
    if (char) {
      onChange(char);
      setCustom('');
    }
  };

  return (
    <div className="pixel-border overflow-hidden" style={{ background: '#12102A' }}>
      {/* Selected + search row */}
      <div className="flex items-center gap-3 border-b border-border p-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center text-2xl"
          style={{ background: '#1A1835', border: '2px solid #2A2450' }}
        >
          {value || '🪦'}
        </div>
        <input
          type="text"
          placeholder="Search or type any emoji..."
          value={search || custom}
          onChange={e => {
            const v = e.target.value;
            // If looks like emoji chars (non-ASCII start), treat as custom
            if (v && Array.from(v)[0] && v.charCodeAt(0) > 127) {
              setCustom(v);
              setSearch('');
            } else {
              setSearch(v);
              setCustom('');
            }
          }}
          onKeyDown={e => { if (e.key === 'Enter') handleCustomSubmit(); }}
          className="pixel-input flex-1 px-3 py-2 text-sm"
          style={{ fontFamily: 'var(--font-vt323)', fontSize: 18 }}
        />
        {custom && (
          <button
            type="button"
            onClick={handleCustomSubmit}
            className="btn-purple shrink-0 px-3 py-2"
            style={{ fontFamily: 'var(--font-pixel)', fontSize: 7 }}
          >
            Use →
          </button>
        )}
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex overflow-x-auto border-b border-border">
          {Object.keys(EMOJI_CATEGORIES).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveTab(cat)}
              className={`shrink-0 px-3 py-2 transition-colors ${
                activeTab === cat
                  ? 'border-b-2 border-purple text-cream'
                  : 'text-muted hover:text-cream'
              }`}
              style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-0 p-2 sm:grid-cols-10">
        {displayEmoji.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            type="button"
            onClick={() => { onChange(emoji); setSearch(''); }}
            title={emoji}
            className={`flex h-9 w-full items-center justify-center text-xl transition-colors hover:bg-surfaceHi ${
              value === emoji ? 'bg-purple/20 outline outline-1 outline-purple' : ''
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Skip option */}
      <div className="border-t border-border p-2 text-center">
        <button
          type="button"
          onClick={() => onChange('')}
          className={`text-dim transition-colors hover:text-muted ${!value ? 'text-muted' : ''}`}
          style={{ fontFamily: 'var(--font-pixel)', fontSize: 6 }}
        >
          {value ? '✕ Remove icon' : '— No icon (text only)'}
        </button>
      </div>
    </div>
  );
}
