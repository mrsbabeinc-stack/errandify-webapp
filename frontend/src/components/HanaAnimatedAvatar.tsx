interface HanaAnimatedAvatarProps {
  isSpeaking?: boolean;
  message?: string;
  onSpeakingEnd?: () => void;
}

export default function HanaAnimatedAvatar(_props: HanaAnimatedAvatarProps) {
  return (
    <div className="relative w-full h-full flex items-end justify-center overflow-hidden">
      <img
        src="/images/Hana_Pose_2_4K.png"
        alt="Hana"
        className="w-full h-full object-cover"
        style={{ objectPosition: 'center 25%' }}
      />
    </div>
  );
}
