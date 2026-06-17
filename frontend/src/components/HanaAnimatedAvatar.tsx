import { useState, useEffect } from 'react';

interface HanaAnimatedAvatarProps {
  isSpeaking?: boolean;
  message?: string;
}

export default function HanaAnimatedAvatar({ isSpeaking = false, message = '' }: HanaAnimatedAvatarProps) {
  const [mouthFrame, setMouthFrame] = useState(0);
  const [armPosition, setArmPosition] = useState(0);
  const [shoulderBob, setShoulderBob] = useState(0);

  // Animate mouth when speaking
  useEffect(() => {
    if (!isSpeaking) {
      setMouthFrame(0);
      return;
    }

    const mouthInterval = setInterval(() => {
      setMouthFrame((f) => (f + 1) % 6);
    }, 120); // 120ms per frame for natural speech rhythm

    return () => clearInterval(mouthInterval);
  }, [isSpeaking]);

  // Natural arm movement while speaking
  useEffect(() => {
    if (!isSpeaking) {
      setArmPosition(0);
      return;
    }

    const armInterval = setInterval(() => {
      setArmPosition((f) => (f + 1) % 60);
    }, 100);

    return () => clearInterval(armInterval);
  }, [isSpeaking]);

  // Shoulder bob while speaking
  useEffect(() => {
    if (!isSpeaking) {
      setShoulderBob(0);
      return;
    }

    const bobInterval = setInterval(() => {
      setShoulderBob((f) => (f + 1) % 40);
    }, 80);

    return () => clearInterval(bobInterval);
  }, [isSpeaking]);

  // Mouth shapes: closed, slightly open, open, wide open, closing, closed
  const getMouthPath = (frame: number): string => {
    const mouthShapes = [
      'M 95 95 Q 100 93 105 95',           // Closed
      'M 94 95 Q 100 97 106 95',           // Slightly open
      'M 93 95 Q 100 100 107 95',          // Open
      'M 92 94 Q 100 103 108 94',          // Wide open
      'M 94 95 Q 100 98 106 95',           // Closing
      'M 95 95 Q 100 93 105 95',           // Closed
    ];
    return mouthShapes[frame % 6];
  };

  // Arm movement calculation
  const getLeftArmTransform = (): string => {
    const wave = Math.sin((armPosition / 60) * Math.PI * 2);
    const rotation = wave * 15; // -15 to 15 degrees
    const lift = Math.sin((armPosition / 60) * Math.PI) * 8; // Up and down movement
    return `translate(20, ${-5 - lift}) rotate(${rotation})`;
  };

  const getRightArmTransform = (): string => {
    const wave = Math.sin(((armPosition + 30) / 60) * Math.PI * 2); // Offset by 30 frames
    const rotation = -wave * 15;
    const lift = Math.sin(((armPosition + 30) / 60) * Math.PI) * 8;
    return `translate(-20, ${-5 - lift}) rotate(${rotation})`;
  };

  // Shoulder bob
  const shoulderTranslate = Math.sin((shoulderBob / 40) * Math.PI * 2) * 3;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Hana Image as base */}
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src="/images/Hana_Pose_2_4K.png"
          alt="Hana"
          className="h-full w-auto object-contain"
          style={{
            filter: 'brightness(0.98)',
          }}
        />

        {/* Animated Face Overlay - SVG for animations */}
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            transform: `translateY(${shoulderTranslate}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          {/* Left Arm - Animated */}
          <g
            style={{
              transformOrigin: '100px 100px',
              transform: getLeftArmTransform(),
              transition: 'transform 0.1s ease-out',
            }}
          >
            <path
              d="M 80 90 Q 70 100 65 120"
              stroke="rgba(245, 213, 192, 0.8)"
              strokeWidth="16"
              fill="none"
              strokeLinecap="round"
            />
            {/* Left Hand */}
            <circle cx="65" cy="120" r="10" fill="rgba(245, 213, 192, 0.8)" />
          </g>

          {/* Right Arm - Animated */}
          <g
            style={{
              transformOrigin: '100px 100px',
              transform: getRightArmTransform(),
              transition: 'transform 0.1s ease-out',
            }}
          >
            <path
              d="M 120 90 Q 130 100 135 120"
              stroke="rgba(245, 213, 192, 0.8)"
              strokeWidth="16"
              fill="none"
              strokeLinecap="round"
            />
            {/* Right Hand */}
            <circle cx="135" cy="120" r="10" fill="rgba(245, 213, 192, 0.8)" />
          </g>

          {/* Mouth - Animated Lip Sync */}
          {isSpeaking && (
            <path
              d={getMouthPath(mouthFrame)}
              stroke="rgba(200, 90, 84, 0.9)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              style={{
                transition: 'd 0.1s ease-out',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
              }}
            />
          )}

          {/* Eye Twinkle - Friendly expression */}
          {isSpeaking && (
            <>
              <circle
                cx="85"
                cy="75"
                r="2.5"
                fill="rgba(255, 255, 255, 0.6)"
                style={{
                  animation: `twinkle 0.4s ease-in-out infinite`,
                }}
              />
              <circle
                cx="115"
                cy="75"
                r="2.5"
                fill="rgba(255, 255, 255, 0.6)"
                style={{
                  animation: `twinkle 0.4s ease-in-out 0.2s infinite`,
                }}
              />
            </>
          )}
        </svg>
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
