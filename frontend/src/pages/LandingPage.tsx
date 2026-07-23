/**
 * Landing page — "the kampung window".
 *
 * The previous version pinned everything inside `h-screen overflow-hidden`, so
 * the whole proposition had to survive at `text-xs` and the family photo sat
 * letterboxed in a grey box. On a marketplace whose supply is retirees,
 * homemakers and part-time tradespeople, small type is not a neutral choice —
 * it is the thing standing between someone and signing up. So this scrolls,
 * and the type is large on purpose.
 *
 * The visual idea is a kampung house window: the photo sits inside an arch,
 * and a peranakan four-petal tile repeats behind everything. The motif is
 * drawn with CSS gradients rather than an image — no extra request, and it
 * scales cleanly on the mid-range Android screens most of this audience uses.
 *
 * Nothing was removed. Every destination the old page offered is still here:
 * Get Started, Sign in, the interest list, How It Works, About, FAQ, and the
 * SingPass line.
 */

/**
 * Vanda Miss Joaquim, repeated as a printed cloth.
 *
 * Replaces a peranakan four-petal tile. That motif was pleasant but generic —
 * it reads Southeast Asian without reading Singaporean. The Vanda is the
 * national flower, so it says exactly where this is from, which is the whole
 * claim the page is making.
 *
 * Two decisions keep it from taking over:
 *
 *  - It is drawn in the brand's own orange and jade, NOT in orchid mauve. The
 *    real flower is violet-pink with a yellow throat, and putting that behind
 *    an orange brand introduces a second colour system competing with the
 *    first. Borrow the shape, not the palette.
 *
 *  - Outline only, hairline weight, very low opacity, and the glyphs sit at
 *    varied angles the way a block-printed cloth does. A filled or fully
 *    coloured print would fight the photograph, which already carries a
 *    floral kebaya and a lot of detail.
 *
 * Inline SVG rather than an image file: no extra request, and it stays crisp
 * at any density on the mid-range Android screens this audience mostly uses.
 */
function orchidGlyph(x: number, y: number, rotate: number, scale: number): string {
  // Drawn against a reference the user supplied, after two wrong attempts.
  //
  // What makes it read as an orchid is the silhouette, not fine detail: FIVE
  // broad, pointed petals radiating at 0/72/144/216/288 degrees, which leaves a
  // natural gap at the bottom for the labellum to point straight down into.
  // Earlier versions used narrow slivers in a ring and read as a paw print.
  //
  // The column is a single small form. A more faithful column with scroll
  // curls turned into an illegible cross once shrunk to background size, so
  // the detail was dropped rather than kept as noise.
  const petal = 'M0 -2 C-8 -10, -8.5 -20, 0 -28 C8.5 -20, 8 -10, 0 -2 Z';
  return `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})">
    <path d="${petal}"/>
    <path d="${petal}" transform="rotate(72)"/>
    <path d="${petal}" transform="rotate(144)"/>
    <path d="${petal}" transform="rotate(216)"/>
    <path d="${petal}" transform="rotate(288)"/>
    <path d="M0 6 C-6.5 10.5, -7 19.5, 0 26 C7 19.5, 6.5 10.5, 0 6 Z"/>
    <ellipse cx="0" cy="0.5" rx="4.6" ry="4.2"/>
  </g>`;
}

const orchidPrint = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 112 112">
    <g fill="#D2521C" fill-opacity="0.12" stroke="#D2521C" stroke-width="1.25" stroke-opacity="0.26" stroke-linejoin="round">
      ${orchidGlyph(28, 29, -12, 0.60)}
      ${orchidGlyph(84, 85, 168, 0.60)}
    </g>
    <g fill="#2FA48F" fill-opacity="0.10" stroke="#2FA48F" stroke-width="1.2" stroke-opacity="0.22" stroke-linejoin="round">
      ${orchidGlyph(84, 28, 20, 0.50)}
      ${orchidGlyph(28, 84, 200, 0.50)}
    </g>
  </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' '))}")`;
})();

const tileMotif: React.CSSProperties = {
  backgroundImage: orchidPrint,
  backgroundSize: '112px 112px',
};

/**
 * The window. Softly shouldered rather than a full dome.
 *
 * A tall arch (48%/34%) looked right empty but cut across the top of the
 * left-hand figure's head — the curve reaches furthest in exactly where the
 * outer faces sit. Fixed radii keep the kampung-window shape while clipping
 * only the extreme corners, and the frame is sized below to leave real
 * headroom above everyone.
 */
const archShape: React.CSSProperties = {
  borderRadius: '76px 76px 26px 26px / 52px 52px 26px 26px',
};

interface ValueProp {
  emoji: string;
  title: string;
  body: string;
  /** Tailwind classes for the icon tile. One accent each, never mixed. */
  tile: string;
}

const VALUE_PROPS: ValueProp[] = [
  {
    emoji: '🧺',
    title: 'Say what you need',
    body: 'A run to the market, a tap that keeps dripping, someone to fetch the kids. Tell us in your own words — we sort out the rest.',
    tile: 'bg-errandify-orange-wash text-errandify-orange-deep',
  },
  {
    emoji: '🏘️',
    title: 'Neighbours, not strangers',
    body: 'Everyone signs in with SingPass, so a real name sits behind every account. You see who is coming, and what others in the block said about them, before they knock.',
    tile: 'bg-kampung-jade-wash text-kampung-jade',
  },
  {
    emoji: '💵',
    title: 'Earn close to home',
    body: 'Free afternoon and a pair of hands? Pick up an errand down the road, help someone out, and get paid for it.',
    tile: 'bg-kampung-sun-wash text-warn',
  },
];

export default function LandingPage() {
  return (
    // `kampung-landing` is not decorative — it scopes the heading rules in
    // index.css that undo the app-wide `h1 { ... !important }` from
    // CompanyModuleTheme.css. Without it the headline silently renders at 24px
    // in the wrong face.
    <div className="kampung-landing min-h-screen bg-errandify-bg font-sans text-gray-800 antialiased">
      {/* Motif sits behind everything, fixed so it does not scroll with the
          content — the page feels laid ON the tile rather than printed on it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-90"
        style={tileMotif}
      />

      {/* Warm light from the top, so the hero has somewhere to sit. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[60vh]"
        style={{
          background:
            'radial-gradient(120% 70% at 50% 0%, rgba(255,138,87,0.22) 0%, rgba(255,250,246,0) 70%)',
        }}
      />

      <div className="relative mx-auto flex max-w-md flex-col px-5 pb-10">
        {/* ------------------------------------------------------- wordmark */}
        <header className="animate-rise relative pt-5 text-center" style={{ animationDelay: '40ms' }}>
          <img
            src="/images/Errandify Logo.png"
            alt="Errandify"
            className="mx-auto h-12 w-auto"
          />

          {/* Second entry point to the waiting list, for anyone who arrives,
              reads "Errandify" and immediately wants to know whether it covers
              their block. Absolutely positioned so the wordmark stays optically
              centred — a flex row would push it off-centre by the pill's width. */}
          <a
            href="/interest"
            className="absolute right-0 top-5 rounded-full border border-errandify-orange/60 bg-white/80 px-3 py-1.5 text-[12px] font-bold text-errandify-orange-deep shadow-kampung-sm backdrop-blur-sm transition-colors hover:bg-errandify-orange-wash"
          >
            Join the list
          </a>

          <p className="k-tagline mt-2 tracking-wide text-errandify-orange-deep">
            Simplifying Life. Amplifying Humanity.
          </p>
        </header>

        {/* ----------------------------------------------------------- hero */}
        <section className="animate-rise mt-5" style={{ animationDelay: '140ms' }}>
          {/* The framed photo is inset rather than full-bleed. The crop has to
              span image rows 140-640 to hold the wordmark out and the cat in,
              and at full width that shape is 471px tall — enough to push the
              headline under the fold on a short screen. Narrowing the frame
              scales its height down proportionally without touching the crop,
              so nothing is lost from the picture. It also suits the idea: a
              portrait in a window, with the tile showing around it. */}
          <div className="relative mx-auto w-[82%]">
            {/* A second arch behind the photo, offset — the frame of the window. */}
            <div
              aria-hidden="true"
              className="absolute -inset-x-2 -top-3 bottom-6 bg-errandify-orange/10"
              style={archShape}
            />
            {/* The frame is sized by RATIO, not by a pixel height, and that is
                load-bearing.

                The source file is a full poster: an Errandify wordmark baked in
                across rows 116–138 of the 660px original, the family's hair
                starting around row 155, and a Get Started button at the very
                bottom. The crop has to thread between the wordmark and the
                hair — a window about 10px wide.

                With a fixed pixel height, `object-position` in percent does not
                hold that window. A narrower container scales the image down, so
                the vertical overflow shrinks, and the same 65% lands higher up
                the image: at 320px wide the window began at row 90 and the
                wordmark was fully visible again. An aspect ratio keeps the
                scale relationship constant, so 65% resolves to image row ~146
                at every width. */}
            <div
              className="relative aspect-[356/500] overflow-hidden bg-gray-100 shadow-kampung"
              style={archShape}
            >
              <img
                src="/images/family_no_button.jpeg"
                alt="Three generations of a Singaporean family at home, with their cat"
                className="h-full w-full object-cover"
                style={{ objectPosition: '50% 87.5%' }}
              />
              {/* Grounds the photo so the headline card does not float on it. */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-24"
                style={{
                  background: 'linear-gradient(to top, rgba(74,50,33,0.45), transparent)',
                }}
              />
            </div>
          </div>

          {/* Headline card, lifted over the arch's lower edge. */}
          {/* Overlap is set by what it covers, not by taste. It is a fixed
              pixel bite out of a frame that is now smaller, so it hides more
              image rows than it used to: 40px reached back over the cat, 24px
              still clipped its chin. 4px shows the cat essentially whole (down
              to image row 635 of 640) while keeping the card visually tucked
              against the photo's edge rather than floating below it. */}
          <div className="relative -mt-1 rounded-individual bg-white/95 px-6 py-5 text-center shadow-kampung backdrop-blur-sm">
            <h1 className="font-display text-[30px] font-black leading-[1.12] text-errandify-brown">
              Get help.
              <br />
              Give help.
              <br />
              <span className="text-errandify-orange-deep">Get paid.</span>
            </h1>
            <p className="k-lede mt-3 text-gray-600">
              The kampung spirit, back on your phone. Ask a neighbour for a hand — or lend one, and
              earn while you are at it.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------- main CTA */}
        <div className="animate-rise mt-6" style={{ animationDelay: '240ms' }}>
          <button
            onClick={() => (window.location.href = '/login')}
            className="w-full rounded-full bg-kampung-gradient py-4 text-[17px] font-bold text-white shadow-kampung transition-transform active:scale-[0.98]"
          >
            Get Started
          </button>
          <p className="k-lede mt-3 text-center text-gray-600">
            Already with us?{' '}
            <a href="/login" className="font-bold text-errandify-orange-deep underline-offset-2 hover:underline">
              Sign in
            </a>
          </p>
        </div>

        {/* ---------------------------------------------------- value props */}
        <section className="mt-9 space-y-3">
          {VALUE_PROPS.map((prop, i) => (
            <article
              key={prop.title}
              className="animate-rise flex gap-4 rounded-individual border border-gray-200/70 bg-white/85 p-4 shadow-kampung-sm"
              style={{ animationDelay: `${320 + i * 90}ms` }}
            >
              <span
                className={`flex h-12 w-12 flex-none items-center justify-center rounded-2xl text-[22px] ${prop.tile}`}
                aria-hidden="true"
              >
                {prop.emoji}
              </span>
              <div className="min-w-0">
                <h2 className="text-errandify-brown">
                  {prop.title}
                </h2>
                <p className="k-body mt-1 text-gray-600">{prop.body}</p>
              </div>
            </article>
          ))}
        </section>

        {/* ------------------------------------------------- interest list */}
        <section
          className="animate-rise mt-7 rounded-individual border-2 border-dashed border-errandify-orange/45 px-5 py-5 text-center"
          style={{ animationDelay: '600ms' }}
        >
          <p className="k-eyebrow text-errandify-brown">
            Not on your block yet?
          </p>
          <p className="k-body mt-1 text-gray-600">
            We open one neighbourhood at a time. Leave your name and we will tell you the day we
            reach yours.
          </p>
          <a
            href="/interest"
            className="mt-4 inline-block w-full rounded-full border-2 border-errandify-orange bg-white py-3 text-[15px] font-bold text-errandify-orange-deep transition-colors hover:bg-errandify-orange-wash"
          >
            Join the list
          </a>
        </section>

        {/* -------------------------------------------------------- footer */}
        <footer className="animate-rise mt-9 text-center" style={{ animationDelay: '680ms' }}>
          <nav className="flex items-center justify-center gap-3 text-[13px] font-semibold text-errandify-orange-deep">
            <a href="/how-it-works" className="hover:underline">
              How It Works
            </a>
            <span aria-hidden="true" className="text-gray-300">
              •
            </span>
            <a href="/about" className="hover:underline">
              About Us
            </a>
            <span aria-hidden="true" className="text-gray-300">
              •
            </span>
            <a href="/faq" className="hover:underline">
              FAQ
            </a>
          </nav>

          <div className="mt-5 flex items-center justify-center gap-2 text-[12px] text-gray-500">
            <span aria-hidden="true">🔒</span>
            <span>Powered by SingPass</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
