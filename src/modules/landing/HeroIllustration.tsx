/**
 * A label card, drawn in the theme's colours: a movement with its category chips and its reason, as the dashboard shows
 * them. It's decoration. It has no text and no numbers, so it can't read as data, and screen readers skip it.
 */
export function HeroIllustration() {
  return (
    <svg
      className="landing__art"
      viewBox="0 0 440 360"
      aria-hidden="true"
      focusable="false"
    >
      {/* A card behind the label card, tilted, for depth. */}
      <rect
        x="46"
        y="22"
        width="340"
        height="236"
        rx="28"
        fill="#0B211D"
        stroke="#2B5247"
        strokeWidth="2"
        transform="rotate(-5 216 140)"
      />

      {/* The label card: the movement, its reason and its category chips. */}
      <rect
        x="20"
        y="58"
        width="400"
        height="270"
        rx="28"
        fill="#16372F"
        stroke="#2B5247"
        strokeWidth="2"
      />

      {/* The movement: a coin, a title, a subtitle and a status. */}
      <circle cx="64" cy="102" r="22" fill="#C8F169" />
      <circle cx="64" cy="102" r="8" fill="#16270C" />
      <rect x="100" y="90" width="164" height="16" rx="8" fill="#EEF5F1" />
      <rect x="100" y="114" width="108" height="10" rx="5" fill="#8BA89C" />
      <rect x="336" y="92" width="48" height="24" rx="12" fill="#2B5247" />
      <circle cx="352" cy="104" r="5" fill="#C8F169" />

      <line x1="44" y1="150" x2="396" y2="150" stroke="#2B5247" strokeWidth="2" />

      {/* The reason, as two lines of text. */}
      <rect x="44" y="172" width="72" height="8" rx="4" fill="#4A7266" />
      <rect x="44" y="190" width="236" height="12" rx="6" fill="#EEF5F1" opacity="0.9" />
      <rect x="44" y="210" width="168" height="10" rx="5" fill="#B4CBC1" opacity="0.5" />

      {/* Category chips: the selected one is lime, the others are outlined. */}
      <rect x="44" y="242" width="112" height="38" rx="19" fill="#C8F169" />
      <circle cx="66" cy="261" r="6" fill="#16270C" />
      <rect x="80" y="255" width="58" height="12" rx="6" fill="#16270C" />
      <rect x="168" y="242" width="96" height="38" rx="19" fill="none" stroke="#4A7266" strokeWidth="2" />
      <circle cx="190" cy="261" r="6" fill="#8BA89C" />
      <rect x="204" y="255" width="46" height="12" rx="6" fill="#B4CBC1" />
      <rect x="276" y="242" width="72" height="38" rx="19" fill="none" stroke="#4A7266" strokeWidth="2" />
      <circle cx="298" cy="261" r="6" fill="#8BA89C" />
      <rect x="312" y="255" width="26" height="12" rx="6" fill="#B4CBC1" />

      {/* The next movement in the list. */}
      <circle cx="64" cy="302" r="12" fill="#2B5247" />
      <rect x="88" y="297" width="120" height="10" rx="5" fill="#B4CBC1" opacity="0.5" />
      <rect x="330" y="297" width="54" height="10" rx="5" fill="#4A7266" />

      {/* A check, labelled as done. */}
      <circle cx="402" cy="44" r="20" fill="#C8F169" />
      <path
        d="M393 45l6 6 12-13"
        fill="none"
        stroke="#16270C"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
