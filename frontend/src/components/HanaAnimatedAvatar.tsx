interface HanaAnimatedAvatarProps {
  isSpeaking?: boolean;
  message?: string;
  onSpeakingEnd?: () => void;
}

/**
 * Hana, full body.
 *
 * `object-cover` with `objectPosition: center 25%` used to crop her. Cover
 * fills the box and discards whatever does not fit, so the moment the box got
 * shorter than the portrait — exactly what happens when the phone keyboard
 * opens — the crop ate her head and left a kebaya with no face on it.
 *
 * `object-contain` never crops: she scales down to fit instead. That is the
 * right trade for a mascot, since smaller is fine and headless is not.
 * Anchored to the bottom so she stands on the floor of her container rather
 * than floating in it.
 */
export default function HanaAnimatedAvatar(_props: HanaAnimatedAvatarProps) {
  return (
    <div className="relative w-full h-full flex items-end justify-center">
      <img
        src="/images/Hana_Pose_2_4K.png"
        alt="Hana"
        className="w-full h-full object-contain"
        style={{ objectPosition: 'center bottom' }}
      />
    </div>
  );
}
