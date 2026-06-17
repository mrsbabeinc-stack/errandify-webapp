import { useState, useEffect, useRef } from 'react';

interface HanaAnimatedAvatarProps {
  isSpeaking?: boolean;
  message?: string;
  onSpeakingEnd?: () => void;
}

export default function HanaAnimatedAvatar({
  isSpeaking = false,
  message = '',
  onSpeakingEnd
}: HanaAnimatedAvatarProps) {
  const [mouthFrame, setMouthFrame] = useState(0);
  const [armPosition, setArmPosition] = useState(0);
  const [shoulderBob, setShoulderBob] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Speak the message using Web Speech API with Singapore female voice
  useEffect(() => {
    if (!isSpeaking || !message) return;

    // Cancel any existing speech
    window.speechSynthesis.cancel();

    // Load voices first
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        speakMessage(message);
      };
      return;
    }

    speakMessage(message);
  }, [isSpeaking, message, onSpeakingEnd]);

  const speakMessage = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    // Prefer Singapore English female voice (case-insensitive)
    let selectedVoice = voices.find(voice =>
      voice.lang.includes('en-SG') &&
      (voice.name.toLowerCase().includes('female') ||
       voice.name.toLowerCase().includes('woman') ||
       voice.name.toLowerCase().includes('zira') ||
       voice.name.toLowerCase().includes('susan') ||
       voice.name.toLowerCase().includes('karen'))
    );

    // Fallback to any Singapore English voice
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => voice.lang.includes('en-SG'));
    }

    // Fallback to British English female
    if (!selectedVoice) {
      selectedVoice = voices.find(voice =>
        voice.lang.includes('en-GB') &&
        (voice.name.toLowerCase().includes('female') ||
         voice.name.toLowerCase().includes('woman'))
      );
    }

    // Fallback to US English female
    if (!selectedVoice) {
      selectedVoice = voices.find(voice =>
        voice.lang.includes('en-US') &&
        (voice.name.toLowerCase().includes('female') ||
         voice.name.toLowerCase().includes('woman') ||
         voice.name.toLowerCase().includes('zira') ||
         voice.name.toLowerCase().includes('susan'))
      );
    }

    // Last resort - any female voice with English
    if (!selectedVoice) {
      selectedVoice = voices.find(voice =>
        voice.lang.startsWith('en') &&
        (voice.name.toLowerCase().includes('female') ||
         voice.name.toLowerCase().includes('woman'))
      );
    }

    // Absolute fallback - any English voice
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.3; // Higher pitch for feminine voice
    utterance.volume = 1;

    synthRef.current = utterance;

    utterance.onend = () => {
      setMouthFrame(0);
      if (onSpeakingEnd) onSpeakingEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Animate mouth when speaking
  useEffect(() => {
    if (!isSpeaking) {
      setMouthFrame(0);
      return;
    }

    const mouthInterval = setInterval(() => {
      setMouthFrame((f) => (f + 1) % 6);
    }, 120);

    return () => clearInterval(mouthInterval);
  }, [isSpeaking]);

  // Animate arms when speaking
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

  // Shoulder bob when speaking
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

  // Mouth shapes for lip-sync
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

  // Left arm movement
  const getLeftArmTransform = (): string => {
    const wave = Math.sin((armPosition / 60) * Math.PI * 2);
    const rotation = wave * 20;
    const lift = Math.sin((armPosition / 60) * Math.PI) * 10;
    return `translate(25, ${-8 - lift}) rotate(${rotation}deg)`;
  };

  // Right arm movement
  const getRightArmTransform = (): string => {
    const wave = Math.sin(((armPosition + 30) / 60) * Math.PI * 2);
    const rotation = -wave * 20;
    const lift = Math.sin(((armPosition + 30) / 60) * Math.PI) * 10;
    return `translate(-25, ${-8 - lift}) rotate(${rotation}deg)`;
  };

  // Shoulder bob
  const shoulderTranslate = Math.sin((shoulderBob / 40) * Math.PI * 2) * 4;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <audio ref={audioRef} />

      {/* Hana Image Container - Half Body Only */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-white">
        {/* Base Image - Full head to waist half-body */}
        <img
          src="/images/Hana_Pose_2_4K.png"
          alt="Hana"
          className="w-full h-full object-cover z-0"
          style={{
            objectPosition: 'center 25%',
          }}
        />

        {/* Animated Overlay SVG - Mouth and subtle gestures (only show when speaking) */}
        {isSpeaking && (
        <svg
          viewBox="0 0 200 120"
          className="absolute top-0 left-0 w-full pointer-events-none"
          preserveAspectRatio="xMidYMid slice"
          style={{
            transform: `translateY(${shoulderTranslate}px)`,
            transition: 'transform 0.1s ease-out',
            opacity: isSpeaking ? 1 : 0,
            pointerEvents: 'none',
            height: '60%',
          }}
        >

          {/* Mouth - Animated Lip Sync */}
          {isSpeaking && (
            <path
              d={getMouthPath(mouthFrame)}
              stroke="rgba(200, 90, 84, 0.95)"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
              style={{
                filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.15))',
              }}
            />
          )}

          {/* Eye Highlights - Friendly expression */}
          {isSpeaking && (
            <>
              <circle
                cx="82"
                cy="70"
                r="3"
                fill="rgba(255, 255, 255, 0.7)"
                style={{
                  animation: `twinkle 0.5s ease-in-out infinite`,
                }}
              />
              <circle
                cx="118"
                cy="70"
                r="3"
                fill="rgba(255, 255, 255, 0.7)"
                style={{
                  animation: `twinkle 0.5s ease-in-out 0.25s infinite`,
                }}
              />
            </>
          )}
        </svg>
        )}
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
