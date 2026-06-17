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

  // Speak the message using Web Speech API with Singapore female voice
  useEffect(() => {
    if (!isSpeaking || !message) return;

    // Cancel any existing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);

    // Load voices
    let voices = window.speechSynthesis.getVoices();

    // If no voices loaded, wait for them
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        selectAndSpeak(utterance, voices);
      };
    } else {
      selectAndSpeak(utterance, voices);
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isSpeaking, message, onSpeakingEnd]);

  const selectAndSpeak = (utterance: SpeechSynthesisUtterance, voices: SpeechSynthesisVoice[]) => {
    // Filter for female voices - check multiple patterns
    const femaleVoices = voices.filter(voice => {
      const name = voice.name.toLowerCase();
      const lang = voice.lang.toLowerCase();

      return (
        name.includes('female') ||
        name.includes('woman') ||
        name.includes('zira') ||
        name.includes('susan') ||
        name.includes('samantha') ||
        name.includes('karen') ||
        name.includes('victoria') ||
        name.includes('moira') ||
        name.includes('fiona') ||
        (lang.includes('en') && !name.includes('male') && !name.includes('man'))
      );
    });

    // Priority: Singapore > British > US > Any English
    let selectedVoice =
      femaleVoices.find(v => v.lang.includes('en-SG')) ||
      femaleVoices.find(v => v.lang.includes('en-GB')) ||
      femaleVoices.find(v => v.lang.includes('en-US')) ||
      femaleVoices.find(v => v.lang.startsWith('en')) ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0];

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('Selected voice:', selectedVoice.name, selectedVoice.lang);
    }

    utterance.rate = 0.9;
    utterance.pitch = 1.3;
    utterance.volume = 1;

    synthRef.current = utterance;

    utterance.onend = () => {
      if (onSpeakingEnd) onSpeakingEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white">
      {/* Clean Hana Image - Half Body Only */}
      <img
        src="/images/Hana_Pose_2_4K.png"
        alt="Hana"
        className="w-full h-full object-cover"
        style={{
          objectPosition: 'center 25%',
        }}
      />
    </div>
  );
}
