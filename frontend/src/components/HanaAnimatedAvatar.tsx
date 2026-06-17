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
  const [mouthOpen, setMouthOpen] = useState(false);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Animate mouth when speaking
  useEffect(() => {
    if (!isSpeaking) {
      setMouthOpen(false);
      return;
    }

    const mouthInterval = setInterval(() => {
      setMouthOpen(prev => !prev);
    }, 150);

    return () => clearInterval(mouthInterval);
  }, [isSpeaking]);

  // Speak the message using Web Speech API
  useEffect(() => {
    if (!isSpeaking || !message) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);

    // Get all available voices
    const allVoices = window.speechSynthesis.getVoices();

    if (allVoices.length === 0) {
      // Wait for voices to load
      window.speechSynthesis.onvoiceschanged = () => {
        const voices = window.speechSynthesis.getVoices();
        selectFemaleVoice(utterance, voices);
      };
    } else {
      selectFemaleVoice(utterance, allVoices);
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isSpeaking, message, onSpeakingEnd]);

  const selectFemaleVoice = (utterance: SpeechSynthesisUtterance, allVoices: SpeechSynthesisVoice[]) => {
    // Debug: Log all available voices
    console.log('Available voices:');
    allVoices.forEach((voice, idx) => {
      console.log(`${idx}: ${voice.name} (${voice.lang}) - default: ${voice.default}`);
    });

    let selectedVoice = null;

    // Try to find female voice - different approach for different OS
    // macOS typically has: Moira, Samantha, Victoria, Fiona (female); Alex, Bruce (male)
    const femaleNames = ['Moira', 'Samantha', 'Victoria', 'Fiona', 'Karen', 'Susan', 'Zira', 'Cortana'];

    for (const name of femaleNames) {
      const found = allVoices.find(v => v.name.includes(name));
      if (found) {
        selectedVoice = found;
        console.log('Found female voice:', selectedVoice.name);
        break;
      }
    }

    // If no specific female voice found, try to filter by other means
    if (!selectedVoice) {
      const englishVoices = allVoices.filter(v => v.lang.startsWith('en'));

      // Try Singapore English first
      selectedVoice = englishVoices.find(v => v.lang.includes('en-SG'));

      // Try British English
      if (!selectedVoice) {
        selectedVoice = englishVoices.find(v => v.lang.includes('en-GB'));
      }

      // Take first English voice
      if (!selectedVoice && englishVoices.length > 0) {
        selectedVoice = englishVoices[0];
      }
    }

    if (!selectedVoice && allVoices.length > 0) {
      selectedVoice = allVoices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('Using voice:', selectedVoice.name, selectedVoice.lang);
    }

    utterance.rate = 0.9;
    utterance.pitch = 1.4; // Even higher pitch for definitely female
    utterance.volume = 1;

    synthRef.current = utterance;

    utterance.onend = () => {
      setMouthOpen(false);
      if (onSpeakingEnd) onSpeakingEnd();
    };

    window.speechSynthesis.speak(utterance);
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

        {/* Mouth Animation Indicator - Simple glow when speaking */}
        {isSpeaking && mouthOpen && (
          <div
            className="absolute pointer-events-none"
            style={{
              width: '40px',
              height: '20px',
              backgroundColor: 'rgba(200, 100, 100, 0.4)',
              borderRadius: '50%',
              left: '50%',
              top: '48%',
              transform: 'translate(-50%, -50%)',
              filter: 'blur(8px)',
              animation: 'pulse 0.3s ease-in-out',
            }}
          />
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
