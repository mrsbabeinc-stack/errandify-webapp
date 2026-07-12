import { useEffect, useState } from 'react';

interface HanaAvatarProps {
  isThinking?: boolean;
  isSpeaking?: boolean;
}

export default function HanaAvatar({ isThinking = false, isSpeaking = false }: HanaAvatarProps) {
  const [blinkFrame, setBlinkFrame] = useState(0);
  const [mouthFrame, setMouthFrame] = useState(0);
  const [headTilt, setHeadTilt] = useState(0);
  const [shoulderBob, setShoulderBob] = useState(0);

  // Blinking animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinkFrame((f) => (f + 1) % 40); // Blink every 40 frames
    }, 100);
    return () => clearInterval(blinkInterval);
  }, []);

  // Speaking animation (mouth sync)
  useEffect(() => {
    if (!isSpeaking) {
      setMouthFrame(0);
      return;
    }

    const speechInterval = setInterval(() => {
      setMouthFrame((f) => (f + 1) % 8);
    }, 150);
    return () => clearInterval(speechInterval);
  }, [isSpeaking]);

  // Head tilt animation (natural movement)
  useEffect(() => {
    const tiltInterval = setInterval(() => {
      setHeadTilt((f) => (f + 1) % 60);
    }, 80);
    return () => clearInterval(tiltInterval);
  }, []);

  // Shoulder bob animation
  useEffect(() => {
    const bobInterval = setInterval(() => {
      setShoulderBob((f) => (f + 1) % 40);
    }, 100);
    return () => clearInterval(bobInterval);
  }, []);

  // Calculate animation values
  const isBlink = blinkFrame > 36 || blinkFrame < 2;
  const mouthOpen = mouthFrame > 2 ? mouthFrame - 2 : 0;
  const tiltDegrees = Math.sin((headTilt / 60) * Math.PI * 2) * 3;
  const bobPixels = Math.sin((shoulderBob / 40) * Math.PI * 2) * 4;

  // Mouth shape based on frame
  const getMouthPath = (frame: number): string => {
    const mouthShapes = [
      'M 45 42 Q 50 40 55 42',        // Smile
      'M 44 42 Q 50 45 56 42',        // Open "o"
      'M 43 41 Q 50 46 57 41',        // More open
      'M 42 40 Q 50 48 58 40',        // Even more open
      'M 45 42 Q 50 41 55 42',        // "ee" smile
      'M 44 43 Q 50 44 56 43',        // Closed "m"
      'M 45 42 Q 50 42 55 42',        // Neutral
      'M 44 42 Q 50 44 56 42',        // Slight open
    ];
    return mouthShapes[frame] || mouthShapes[0];
  };

  return (
    <div className="flex justify-center items-center py-4">
      <svg
        width="120"
        height="150"
        viewBox="0 0 120 150"
        className="filter drop-shadow-lg"
        style={{
          transform: `translateY(${bobPixels}px)`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        {/* Head */}
        <g
          style={{
            transform: `rotateZ(${tiltDegrees}deg)`,
            transformOrigin: '60px 50px',
            transition: 'transform 0.1s ease-out',
          }}
        >
          {/* Face */}
          <circle cx="60" cy="50" r="35" fill="#F5D5C0" stroke="#D4A574" strokeWidth="2" />

          {/* Hair */}
          <path
            d="M 25 50 Q 25 15 60 12 Q 95 15 95 50"
            fill="#1a1a1a"
            stroke="#0f0f0f"
            strokeWidth="1.5"
          />

          {/* Left Eye */}
          <ellipse
            cx="45"
            cy="45"
            rx="6"
            ry="7"
            fill="white"
            stroke="#333"
            strokeWidth="1"
          />
          <circle
            cx="45"
            cy="46"
            r="4"
            fill="#6B4423"
            style={{
              animation: `none`,
            }}
          />
          <circle cx="46" cy="44" r="1.5" fill="white" />

          {/* Left Eyelid (blink) */}
          {isBlink && (
            <ellipse
              cx="45"
              cy="45"
              rx="6"
              ry="4"
              fill="#F5D5C0"
              opacity="0.9"
            />
          )}

          {/* Right Eye */}
          <ellipse
            cx="75"
            cy="45"
            rx="6"
            ry="7"
            fill="white"
            stroke="#333"
            strokeWidth="1"
          />
          <circle
            cx="75"
            cy="46"
            r="4"
            fill="#6B4423"
          />
          <circle cx="76" cy="44" r="1.5" fill="white" />

          {/* Right Eyelid (blink) */}
          {isBlink && (
            <ellipse
              cx="75"
              cy="45"
              rx="6"
              ry="4"
              fill="#F5D5C0"
              opacity="0.9"
            />
          )}

          {/* Eyebrows */}
          <path
            d="M 38 35 Q 45 32 52 35"
            stroke="#8B6F47"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 68 35 Q 75 32 82 35"
            stroke="#8B6F47"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />

          {/* Nose */}
          <path
            d="M 60 45 L 58 55 L 62 55"
            stroke="#D4A574"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />

          {/* Mouth */}
          <path
            d={getMouthPath(mouthOpen)}
            stroke="#C85A54"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />

          {/* Blush */}
          <ellipse cx="32" cy="55" rx="8" ry="5" fill="#FFB3BA" opacity="0.6" />
          <ellipse cx="88" cy="55" rx="8" ry="5" fill="#FFB3BA" opacity="0.6" />
        </g>

        {/* Shoulders */}
        <g style={{ transform: `translateY(${bobPixels * 0.5}px)` }}>
          <ellipse cx="35" cy="95" rx="18" ry="15" fill="#87CEEB" />
          <ellipse cx="85" cy="95" rx="18" ry="15" fill="#87CEEB" />
        </g>

        {/* Arms */}
        <g
          style={{
            transform: `translateY(${bobPixels * 0.5}px)`,
          }}
        >
          {/* Left Arm */}
          <path
            d="M 30 90 Q 15 100 12 115"
            stroke="#F5D5C0"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            style={{
              animation: `sway 3s ease-in-out infinite`,
            }}
          />
          {/* Right Arm */}
          <path
            d="M 90 90 Q 105 100 108 115"
            stroke="#F5D5C0"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            style={{
              animation: `sway 3s ease-in-out infinite 1.5s`,
            }}
          />
        </g>

        {/* Thinking indicator */}
        {isThinking && (
          <g>
            <circle
              cx="105"
              cy="20"
              r="3"
              fill="#FFD700"
              opacity="0.8"
              style={{
                animation: `float 2s ease-in-out infinite`,
              }}
            />
            <circle
              cx="98"
              cy="12"
              r="2"
              fill="#FFD700"
              opacity="0.6"
              style={{
                animation: `float 2s ease-in-out infinite 0.5s`,
              }}
            />
            <circle
              cx="112"
              cy="12"
              r="2"
              fill="#FFD700"
              opacity="0.6"
              style={{
                animation: `float 2s ease-in-out infinite 1s`,
              }}
            />
          </g>
        )}
      </svg>

      <style>{`
        @keyframes sway {
          0%, 100% { transform: rotateZ(0deg); }
          50% { transform: rotateZ(8deg); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); opacity: 0.8; }
          50% { transform: translateY(-8px); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
