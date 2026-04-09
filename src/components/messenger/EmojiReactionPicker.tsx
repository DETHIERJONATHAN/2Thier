/**
 * 😀 EmojiReactionPicker — Full Facebook-style emoji picker
 * Quick reactions bar + comprehensive categorized emoji grid
 */
import React, { useState, useMemo } from 'react';
import { Popover, Input } from 'antd';
import { SmileOutlined, SearchOutlined } from '@ant-design/icons';

// Quick reactions (top bar, always visible)
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

// ─── Flag emoji helpers (render via Twemoji CDN for cross-platform) ───
const isFlagEmoji = (emoji: string): boolean => {
  const cp = [...emoji].map(c => c.codePointAt(0) || 0);
  // Regional indicator pairs (🇧🇪 🇫🇷 etc.)
  if (cp.length >= 2 && cp[0] >= 0x1F1E6 && cp[0] <= 0x1F1FF && cp[1] >= 0x1F1E6 && cp[1] <= 0x1F1FF) return true;
  // Tag sequences (🏴󠁧󠁢󠁥󠁮󠁧󠁿) or special flags (🏳️‍🌈 🏴‍☠️)
  if (cp[0] === 0x1F3F4 || cp[0] === 0x1F3F3) return true;
  return false;
};

const emojiToTwemojiUrl = (emoji: string): string => {
  const cps = [...emoji]
    .map(c => c.codePointAt(0) || 0)
    .filter(cp => cp !== 0xFE0F) // strip variation selector
    .map(cp => cp.toString(16));
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/${cps.join('-')}.png`;
};

/** Renders an emoji — uses Twemoji images for flags (cross-platform) */
const EmojiChar: React.FC<{ emoji: string; size?: number }> = ({ emoji, size = 24 }) => {
  if (isFlagEmoji(emoji)) {
    return <img src={emojiToTwemojiUrl(emoji)} alt={emoji} style={{ width: size, height: size, display: 'inline-block' }} loading="lazy" />;
  }
  return <>{emoji}</>;
};

// ─── Full emoji database organized by Facebook categories ───
const EMOJI_CATEGORIES: Record<string, { icon: string; label: string; emojis: string[] }> = {
  smileys: {
    icon: '😊', label: 'Smileys',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','🫠','😉','😊','😇',
      '🥰','😍','🤩','😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝',
      '🤑','🤗','🤭','🫢','🫣','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥',
      '😶‍🌫️','😏','😒','🙄','😬','😮‍💨','🤥','🫨','😌','😔','😪','🤤','😴',
      '😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','😵‍💫','🤯','🤠','🥳','🥸',
      '😎','🤓','🧐','😕','🫤','😟','🙁','☹️','😮','😯','😲','😳','🥺','🥹',
      '😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫',
      '🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻',
      '👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾',
    ],
  },
  gestures: {
    icon: '👋', label: 'Gestes',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','🫷','🫸','👌','🤌','🤏',
      '✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍',
      '👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅',
      '🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴',
      '👀','👁️','👅','👄','🫦','👶','🧒','👦','👧','🧑','👱','👨','🧔','👩',
      '🧓','👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷',
    ],
  },
  hearts: {
    icon: '❤️', label: 'Coeurs',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️',
      '💕','💞','💓','💗','💖','💘','💝','💟','♥️','💋','💌','💐','🌹','🥀',
      '💍','💎','🫂','💏','💑','👪','👨‍👩‍👦','👨‍👩‍👧','👨‍👩‍👧‍👦',
    ],
  },
  animals: {
    icon: '🐶', label: 'Animaux',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮',
      '🐷','🐽','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥',
      '🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🫎','🐝','🪱','🐛','🦋','🐌',
      '🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🕸️','🦂','🐢','🐍','🦎','🦖',
      '🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🪸',
      '🐊','🐅','🐆','🦓','🫏','🦍','🦧','🐘','🦣','🦛','🦏','🐪','🐫','🦒',
      '🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩',
      '🦮','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🪿','🦩','🕊️',
      '🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔','🐾','🐉','🐲',
      '🌵','🎄','🌲','🌳','🌴','🪵','🌱','🌿','☘️','🍀','🎍','🪴','🎋','🍃',
      '🍂','🍁','🪺','🪹','🍄','🌾','💐','🌷','🌹','🥀','🌺','🌸','🌼','🌻',
    ],
  },
  food: {
    icon: '🍔', label: 'Nourriture',
    emojis: [
      '🍇','🍈','🍉','🍊','🍋','🍌','🍍','🥭','🍎','🍏','🍐','🍑','🍒','🍓',
      '🫐','🥝','🍅','🫒','🥥','🥑','🍆','🥔','🥕','🌽','🌶️','🫑','🥒','🥬',
      '🥦','🧄','🧅','🥜','🫘','🌰','🫚','🫛','🍞','🥐','🥖','🫓','🥨','🥯',
      '🥞','🧇','🧀','🍖','🍗','🥩','🥓','🍔','🍟','🍕','🌭','🥪','🌮','🌯',
      '🫔','🥙','🧆','🥚','🍳','🥘','🍲','🫕','🥣','🥗','🍿','🧈','🧂','🥫',
      '🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣','🍤','🍥','🥮','🍡',
      '🥟','🥠','🥡','🦀','🦞','🦐','🦑','🦪','🍦','🍧','🍨','🍩','🍪','🎂',
      '🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍼','🥛','☕','🫖','🍵','🍶',
      '🍾','🍷','🍸','🍹','🍺','🍻','🥂','🥃','🫗','🥤','🧋','🧃','🧉','🧊',
    ],
  },
  activities: {
    icon: '⚽', label: 'Activités',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒',
      '🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹',
      '🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤸','⛹️','🤺','🏇','🧘',
      '🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️',
      '🎗️','🎫','🎟️','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🪇',
      '🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🕹️','🧩','🪅',
    ],
  },
  travel: {
    icon: '✈️', label: 'Voyage',
    emojis: [
      '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜',
      '🏍️','🛵','🦽','🦼','🛺','🚲','🛴','🛹','🛼','🚏','🛣️','🛤️','🛞','⛽',
      '🛞','🚨','🚥','🚦','🛑','🚧','⚓','🛟','⛵','🛶','🚤','🛳️','⛴️','🛥️',
      '🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡','🛰️','🚀','🛸',
      '🏠','🏡','🏘️','🏚️','🏗️','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫',
      '🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩️','🕋','⛲',
      '⛺','🌁','🌃','🏙️','🌄','🌅','🌆','🌇','🌉','🗾','🏔️','⛰️','🌋','🗻',
      '🏕️','🏖️','🏜️','🏝️','🏞️','🎠','🎡','🎢','💈','🎪','🗺️','🧭','🌍','🌎','🌏',
    ],
  },
  objects: {
    icon: '💡', label: 'Objets',
    emojis: [
      '⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗜️','💾','💿','📀',
      '📼','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️',
      '🎚️','🎛️','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🪫','🔌','💡',
      '🔦','🕯️','🪔','🧯','🛢️','🪙','💵','💴','💶','💷','🪪','💳','💎','⚖️',
      '🪜','🧰','🪛','🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️','🪤','🧱','⛓️',
      '🧲','🔫','💣','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','🪦','⚱️','🏺','🔮',
      '📿','🧿','🪬','💈','⚗️','🔭','🔬','🕳️','🩻','🩹','🩺','💊','💉','🩸',
      '🧬','🦠','🧫','🧪','🌡️','🧹','🪠','🧺','🧻','🚽','🚰','🚿','🛁','🛀',
      '🪥','🪒','🧴','🧷','🧹','🧺','🧻','🧼','🫧','🪥','🪒','🧽','🪣','🧯',
      '📌','📍','✂️','🖊️','🖋️','✒️','🖌️','🖍️','📝','✏️','🔍','🔎','🔏','🔐','🔑',
      '🗝️','🔒','🔓','📎','🖇️','📐','📏','🗂️','📁','📂','🗃️','📅','📆','🗒️',
      '📇','📈','📉','📊','📋','✉️','📧','📨','📩','📤','📥','📦','📫','📭',
      '📬','📮','🗳️','✅','☑️','⭕','❌','❎','➕','➖','➗','✖️','♾️','❗','❓',
      '🔔','🔕','🔊','🔇','📣','📢','🏷️','🔖','📰','🗞️','🪧','🏴','🏳️',
    ],
  },
  symbols: {
    icon: '💯', label: 'Symboles',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️',
      '💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️',
      '🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐',
      '♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺',
      '🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎',
      '🆑','🅾️','🆘','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🔞','📵',
      '🚭','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','〽️','⚠️','🚸','🔱','⚜️',
      '🔰','♻️','✅','🈯','💹','❇️','✳️','❎','🌐','💠','Ⓜ️','🌀','💤','🏧',
      '🚾','♿','🅿️','🛗','🈳','🈂️','🛂','🛃','🛄','🛅','🚰','🚹','🚺','🚻',
      '🚼','⚧️','🚮','🎦','📶','🈁','🔣','ℹ️','🔤','🔡','🔠','🆖','🆗','🆙',
      '🆒','🆕','🆓','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟',
      '🔢','#️⃣','*️⃣','⏏️','▶️','⏸️','⏯️','⏹️','⏺️','⏭️','⏮️','⏩','⏪','⏫',
      '⏬','◀️','🔼','🔽','➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','↕️','↔️',
      '🔀','🔁','🔂','🔄','🔃','🎵','🎶','✖️','➕','➖','➗','♾️','💲','💱',
      '™️','©️','®️','👁️‍🗨️','🔚','🔙','🔛','🔝','🔜','〰️','➰','➿','✔️','☑️',
      '🔘','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔸','🔹',
      '🔶','🔷','🔳','🔲','▪️','▫️','◾','◽','◼️','◻️','🟥','🟧','🟨','🟩',
      '🟦','🟪','⬛','⬜','🟫','🔈','🔉','🔊','🔇','📣','📢','🔔','🔕',
    ],
  },
  flags: {
    icon: '🏳️', label: 'Drapeaux',
    emojis: [
      '🏳️','🏴','🏁','🚩','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️',
      '🇧🇪','🇫🇷','🇩🇪','🇮🇹','🇪🇸','🇬🇧','🇺🇸','🇨🇦','🇧🇷','🇲🇽','🇯🇵','🇰🇷',
      '🇨🇳','🇮🇳','🇦🇺','🇷🇺','🇳🇱','🇵🇹','🇨🇭','🇦🇹','🇸🇪','🇳🇴','🇩🇰','🇫🇮',
      '🇮🇪','🇵🇱','🇨🇿','🇭🇺','🇷🇴','🇧🇬','🇭🇷','🇸🇰','🇸🇮','🇱🇺','🇬🇷','🇹🇷',
      '🇪🇬','🇿🇦','🇳🇬','🇰🇪','🇲🇦','🇹🇳','🇸🇳','🇨🇮','🇬🇭','🇨🇲',
      '🇦🇷','🇨🇱','🇨🇴','🇻🇪','🇵🇪','🇺🇾','🇪🇨','🇵🇾','🇧🇴',
      '🇮🇱','🇸🇦','🇦🇪','🇶🇦','🇰🇼','🇱🇧','🇯🇴','🇮🇶','🇮🇷',
      '🇹🇭','🇻🇳','🇮🇩','🇲🇾','🇸🇬','🇵🇭','🇹🇼','🇭🇰','🇲🇴',
      '🇳🇿','🇫🇯','🇵🇬',
      '🇺🇳','🏴󠁧󠁢󠁥󠁮󠁧󠁿','🏴󠁧󠁢󠁳󠁣󠁴󠁿','🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    ],
  },
};

const ALL_CATEGORY_KEYS = Object.keys(EMOJI_CATEGORIES);

interface EmojiReactionPickerProps {
  onSelect: (emoji: string) => void;
  trigger?: 'click' | 'hover';
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'topLeft' | 'topRight';
  children?: React.ReactNode;
}

export const EmojiReactionPicker: React.FC<EmojiReactionPickerProps> = ({
  onSelect,
  trigger = 'click',
  placement = 'top',
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY_KEYS[0]);
  const [search, setSearch] = useState('');

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
    setSearch('');
  };

  // Flatten all emojis for search
  const allEmojis = useMemo(() => {
    const set = new Set<string>();
    for (const cat of Object.values(EMOJI_CATEGORIES)) {
      for (const e of cat.emojis) set.add(e);
    }
    return Array.from(set);
  }, []);

  const displayEmojis = search
    ? allEmojis // When searching, show all (native emojis can't be text-searched easily, show all)
    : EMOJI_CATEGORIES[activeCategory]?.emojis || [];

  const content = (
    <div style={{ width: 340 }}>
      {/* Quick reactions bar */}
      <div className="flex items-center justify-between mb-2 pb-2" style={{ borderBottom: '1px solid #e4e6eb' }}>
        {QUICK_REACTIONS.map(emoji => (
          <button
            key={emoji}
            onClick={() => handleSelect(emoji)}
            className="text-2xl hover:scale-150 transition-transform p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
            style={{ lineHeight: 1 }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Search */}
      <Input
        prefix={<SearchOutlined style={{ color: '#999' }} />}
        placeholder="Rechercher un emoji..."
        size="small"
        value={search}
        onChange={e => setSearch(e.target.value)}
        allowClear
        style={{ marginBottom: 8, borderRadius: 20 }}
      />

      {/* Category tabs */}
      <div className="flex gap-0.5 mb-2 pb-1" style={{ borderBottom: '1px solid #e4e6eb', overflowX: 'auto' }}>
        {ALL_CATEGORY_KEYS.map(key => {
          const cat = EMOJI_CATEGORIES[key];
          return (
            <button
              key={key}
              onClick={() => { setActiveCategory(key); setSearch(''); }}
              title={cat.label}
              className="cursor-pointer transition-colors"
              style={{
                fontSize: 18, padding: '4px 6px', borderRadius: 8, flexShrink: 0,
                background: !search && activeCategory === key ? '#e7f3ff' : 'transparent',
                border: !search && activeCategory === key ? '1px solid #1877f2' : '1px solid transparent',
              }}
            >
              {cat.icon}
            </button>
          );
        })}
      </div>

      {/* Category label */}
      {!search && (
        <div style={{ fontSize: 12, color: '#65676b', marginBottom: 4, fontWeight: 600 }}>
          {EMOJI_CATEGORIES[activeCategory]?.label}
        </div>
      )}

      {/* Emoji grid — fill entire width */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 1fr)',
          maxHeight: 250, overflowY: 'auto', gap: 0,
        }}
      >
        {displayEmojis.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            onClick={() => handleSelect(emoji)}
            className="hover:scale-110 transition-transform hover:bg-gray-100 cursor-pointer"
            style={{ fontSize: 24, lineHeight: 1, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', borderRadius: 6, padding: 0 }}
          >
            <EmojiChar emoji={emoji} size={24} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger={trigger}
      placement={placement}
      open={open}
      onOpenChange={(v) => { setOpen(v); if (!v) setSearch(''); }}
      styles={{ body: { padding: 10 } }}
      zIndex={2000}
    >
      {children || (
        <button className="text-gray-400 hover:text-yellow-400 transition-colors cursor-pointer p-1">
          <SmileOutlined />
        </button>
      )}
    </Popover>
  );
};

export default EmojiReactionPicker;
