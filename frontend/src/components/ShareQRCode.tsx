import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

/**
 * A QR code, generated on the device.
 *
 * It previously came from `api.qrserver.com`: the referral link was put in a
 * query string and sent to a third-party server every time anyone opened their
 * referral page or an errand's share panel. Two problems with that, and both
 * are avoidable for free.
 *
 * The first is disclosure. A referral code identifies one account, and the
 * request carries the viewer's IP alongside it, so an outside party was being
 * told that a particular person holds a particular code. Under the PDPA's
 * Transfer Limitation Obligation (s26 and Regulation 10) an organisation
 * sending personal data overseas has to satisfy itself the recipient offers
 * comparable protection, and there is no assessment or contract behind a free
 * public endpoint. Generating locally means nothing leaves the device at all,
 * so the obligation never arises.
 *
 * The second is that a core sharing feature depended on a free service with no
 * SLA. If it rate-limited or went down, every QR on the platform broke, and
 * the failure was silent — the old code had an `onload` handler and no
 * `onerror`, so a failed fetch left a blank canvas with no message.
 *
 * QR encoding is pure arithmetic and needs no network. `qrcode` does it in
 * about 20KB.
 *
 * I am not a lawyer; confirm the transfer position with a practitioner if the
 * third-party version is ever reinstated.
 */

interface Props {
  /** The URL to encode. */
  value: string;
  /** Rendered width in CSS pixels. Drawn at 2× for retina. */
  size?: number;
  /** Filename offered when the user downloads it, without extension. */
  downloadName?: string;
  /** Show a download button beneath the code. */
  downloadable?: boolean;
  /**
   * Receives the canvas, so a page that already has its own download button
   * laid out can keep using it instead of the built-in one.
   */
  canvasRefOut?: React.MutableRefObject<HTMLCanvasElement | null>;
  className?: string;
}

export default function ShareQRCode({
  value,
  size = 200,
  downloadName = 'errandify-qr',
  downloadable = false,
  canvasRefOut,
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (canvasRefOut) canvasRefOut.current = canvasRef.current;
  }, [canvasRefOut, ready]);

  useEffect(() => {
    let cancelled = false;
    if (!value) return;

    setReady(false);
    setError(null);

    QRCode.toCanvas(canvasRef.current, value, {
      width: size * 2, // drawn at 2×, displayed at 1× so it stays sharp
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#3D2914', light: '#FFFFFF' },
    })
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e) => {
        // Reported, not swallowed. The old version failed silently and left an
        // empty square, which looks identical to a slow connection.
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not draw the QR code');
      });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${downloadName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 rounded-xl text-xs text-gray-500 text-center p-3 ${className}`}
        style={{ width: size, height: size }}
      >
        Could not create the QR code. The link below still works.
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, opacity: ready ? 1 : 0.3 }}
        className="rounded-xl transition-opacity"
        aria-label="QR code for your invite link"
      />
      {downloadable && ready && (
        <button
          type="button"
          onClick={download}
          className="text-xs font-semibold text-errandify-orange hover:underline"
        >
          Download QR
        </button>
      )}
    </div>
  );
}
