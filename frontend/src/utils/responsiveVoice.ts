/**
 * Lazy-loads ResponsiveVoice.JS on first use, so its script does not sit in the
 * startup path.
 *
 * This used to live in main.tsx, which meant HanaTaskCreation imported the app's
 * entry point to get at it. That put main.tsx into the module graph as an
 * ordinary dependency, so any HMR update re-executed it — and re-executing the
 * entry calls ReactDOM.createRoot() a second time on the same #root node. React
 * warned about the double root and then threw inside <App>. Cold loads were
 * always fine; the errors only appeared after an edit, which is what made it
 * look like a tunnel problem.
 *
 * Keeping it in its own module means nothing imports the entry point.
 */
export const loadResponsiveVoice = (): Promise<void> => {
  return new Promise<void>((resolve) => {
    if ((window as any).responsiveVoice) {
      console.log('[Hana] ResponsiveVoice already loaded');
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://code.responsivevoice.org/responsivevoice.js';
    script.onload = () => {
      console.log('[Hana] ResponsiveVoice.JS loaded');
      resolve();
    };
    script.onerror = () => {
      console.warn('[Hana] Failed to load ResponsiveVoice');
      resolve(); // Don't break if it fails
    };
    document.head.appendChild(script);
  });
};
