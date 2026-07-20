interface HanaAnimatedAvatarProps {
  isSpeaking?: boolean;
  message?: string;
  onSpeakingEnd?: () => void;
}

export default function HanaAnimatedAvatar({
  isSpeaking = false,
}: HanaAnimatedAvatarProps) {
  return (
    <div className="relative w-full h-full flex items-end justify-center overflow-hidden">
      <style>{`
        @keyframes hanaFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-10px) rotate(-0.6deg); }
        }
        @keyframes hanaTalk {
          0%, 100% { transform: translateY(0) scale(1); }
          25%      { transform: translateY(-5px) scale(1.012) rotate(0.4deg); }
          50%      { transform: translateY(0) scale(1); }
          75%      { transform: translateY(-4px) scale(1.008) rotate(-0.4deg); }
        }
        @keyframes hanaGlow {
          0%, 100% { opacity: 0.35; transform: translateX(-50%) scale(1); }
          50%      { opacity: 0.7;  transform: translateX(-50%) scale(1.08); }
        }
      `}</style>

      {/* Speaking glow behind Hana */}
      {isSpeaking && (
        <div
          className="absolute left-1/2 bottom-8 w-56 h-56 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,140,66,0.45) 0%, rgba(255,140,66,0) 70%)',
            animation: 'hanaGlow 0.9s ease-in-out infinite',
          }}
        />
      )}

      <img
        src="/images/Hana_Pose_2_4K.png"
        alt="Hana"
        className="relative w-full h-full object-cover"
        style={{
          objectPosition: 'center 25%',
          transformOrigin: 'center bottom',
          animation: isSpeaking
            ? 'hanaTalk 0.7s ease-in-out infinite'
            : 'hanaFloat 4.5s ease-in-out infinite',
        }}
      />
    </div>
  );
}
