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
  const [armFrame, setArmFrame] = useState(0);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Animate mouth when speaking
  useEffect(() => {
    if (!isSpeaking) {
      setMouthFrame(0);
      return;
    }

    const mouthInterval = setInterval(() => {
      setMouthFrame((f) => (f + 1) % 4);
    }, 120);

    return () => clearInterval(mouthInterval);
  }, [isSpeaking]);

  // Animate arms when speaking
  useEffect(() => {
    if (!isSpeaking) {
      setArmFrame(0);
      return;
    }

    const armInterval = setInterval(() => {
      setArmFrame((f) => (f + 1) % 60);
    }, 100);

    return () => clearInterval(armInterval);
  }, [isSpeaking]);

  // Speak the message using Web Speech API
  useEffect(() => {
    if (!isSpeaking || !message) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);

    // Get all available voices
    let allVoices = window.speechSynthesis.getVoices();

    if (allVoices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        allVoices = window.speechSynthesis.getVoices();
        selectFemaleVoice(utterance, allVoices);
      };
    } else {
      selectFemaleVoice(utterance, allVoices);
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isSpeaking, message, onSpeakingEnd]);

  const selectFemaleVoice = (utterance: SpeechSynthesisUtterance, allVoices: SpeechSynthesisVoice[]) => {
    // Explicit female voice names
    const femaleNames = ['Moira', 'Samantha', 'Victoria', 'Fiona', 'Karen', 'Susan', 'Zira', 'Cortana'];

    let selectedVoice = null;

    for (const name of femaleNames) {
      const found = allVoices.find(v => v.name.includes(name));
      if (found) {
        selectedVoice = found;
        break;
      }
    }

    if (!selectedVoice) {
      const englishVoices = allVoices.filter(v => v.lang.startsWith('en'));
      selectedVoice = englishVoices.find(v => v.lang.includes('en-SG')) ||
                     englishVoices.find(v => v.lang.includes('en-GB')) ||
                     englishVoices[0];
    }

    if (!selectedVoice && allVoices.length > 0) {
      selectedVoice = allVoices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = 0.9;
    utterance.pitch = 1.4;
    utterance.volume = 1;

    synthRef.current = utterance;

    utterance.onend = () => {
      setMouthFrame(0);
      setArmFrame(0);
      if (onSpeakingEnd) onSpeakingEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Calculate arm positions based on frame
  const getLeftArmRotation = () => {
    const wave = Math.sin((armFrame / 60) * Math.PI * 2);
    return wave * 25; // -25 to 25 degrees
  };

  const getRightArmRotation = () => {
    const wave = Math.sin(((armFrame + 30) / 60) * Math.PI * 2);
    return -wave * 25; // Opposite direction
  };

  const getArmLift = () => {
    return Math.sin((armFrame / 60) * Math.PI) * 15; // 0-15px up and down
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white overflow-hidden">
      {/* Hana Image Container */}
      <div className="relative w-full h-full">
        <img
          src="/images/Hana_Pose_2_4K.png"
          alt="Hana"
          className="w-full h-full object-cover"
          style={{
            objectPosition: 'center 25%',
          }}
        />

        {/* SVG Overlay for Animations - Only when speaking */}
        {isSpeaking && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 200 300"
            preserveAspectRatio="xMidYMid slice"
            style={{ opacity: 1 }}
          >
            {/* Left Arm */}
            <g
              style={{
                transformOrigin: '70px 80px',
                transform: `rotate(${getLeftArmRotation()}deg) translateY(-${getArmLift()}px)`,
                transition: 'transform 0.1s ease-out',
              }}
            >
              <path
                d="M 70 80 Q 50 100 45 130"
                stroke="rgba(245, 213, 192, 0.9)"
                strokeWidth="20"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="45" cy="130" r="12" fill="rgba(245, 213, 192, 0.9)" />
            </g>

            {/* Right Arm */}
            <g
              style={{
                transformOrigin: '130px 80px',
                transform: `rotate(${getRightArmRotation()}deg) translateY(-${getArmLift()}px)`,
                transition: 'transform 0.1s ease-out',
              }}
            >
              <path
                d="M 130 80 Q 150 100 155 130"
                stroke="rgba(245, 213, 192, 0.9)"
                strokeWidth="20"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="155" cy="130" r="12" fill="rgba(245, 213, 192, 0.9)" />
            </g>

            {/* Mouth - Simple lip sync */}
            {mouthFrame > 0 && (
              <ellipse
                cx="100"
                cy="110"
                rx={8 + mouthFrame * 2}
                ry={4 + mouthFrame}
                fill="rgba(200, 90, 84, 0.5)"
                style={{
                  transition: 'all 0.12s ease-out',
                }}
              />
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
