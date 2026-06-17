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

  // Voice disabled - removed


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
