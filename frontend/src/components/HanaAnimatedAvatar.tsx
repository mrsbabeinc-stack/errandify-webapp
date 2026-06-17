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
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

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
    // Prioritize Diana, then other female voices
    const femaleNames = ['Diana', 'Moira', 'Samantha', 'Victoria', 'Fiona', 'Karen', 'Susan', 'Zira', 'Cortana'];

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
      if (onSpeakingEnd) onSpeakingEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white overflow-hidden">
      {/* Hana Image Container */}
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src="/images/Hana_Pose_2_4K.png"
          alt="Hana"
          className="w-full h-full object-cover"
          style={{
            objectPosition: 'center 25%',
          }}
        />
      </div>
    </div>
  );
}
