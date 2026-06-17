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
    // Log available voices for debugging
    console.log('Available voices:', allVoices.map(v => ({ name: v.name, lang: v.lang })));

    // First try Singapore English voices
    let selectedVoice = null;

    const sgVoices = allVoices.filter(v => v.lang.includes('en-SG'));
    console.log('SG voices found:', sgVoices.length);
    if (sgVoices.length > 0) {
      selectedVoice = sgVoices.find(v => v.name.includes('Female')) || sgVoices[0];
    }

    // Fallback to explicit female voice names
    if (!selectedVoice) {
      const femaleNames = ['Diana', 'Moira', 'Samantha', 'Victoria', 'Fiona', 'Karen', 'Susan', 'Zira', 'Cortana'];
      for (const name of femaleNames) {
        const found = allVoices.find(v => v.name.includes(name));
        if (found) {
          console.log('Using voice:', name);
          selectedVoice = found;
          break;
        }
      }
    }

    // Fallback to any English voice with female indicator
    if (!selectedVoice) {
      const englishVoices = allVoices.filter(v => v.lang.startsWith('en'));
      selectedVoice = englishVoices.find(v => v.name.includes('Female')) ||
                     englishVoices.find(v => v.lang.includes('en-GB')) ||
                     englishVoices[0];
    }

    if (!selectedVoice && allVoices.length > 0) {
      selectedVoice = allVoices[0];
    }

    if (selectedVoice) {
      console.log('Final voice selected:', selectedVoice.name, selectedVoice.lang);
      utterance.voice = selectedVoice;
    }

    utterance.rate = 0.85;
    utterance.pitch = 1.2;
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
