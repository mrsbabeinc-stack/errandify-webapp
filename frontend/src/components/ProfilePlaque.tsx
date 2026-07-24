interface ProfilePlaqueProps {
  name: string;
  gender?: string;
  bio?: string;
  certificates?: Array<{ title: string }>;
  profileImage?: string;
  role?: string;
  trustedCount?: number;
  completedTasks?: number;
  postedTasks?: number;
  alias?: string;
  averageRating?: number;
  reviewCount?: number;
}

export default function ProfilePlaque({
  name,
  gender,
  bio,
  certificates,
  profileImage,
  role,
  trustedCount = 0,
  completedTasks = 0,
  postedTasks = 0,
  alias,
  averageRating = 0,
  reviewCount = 0,
}: ProfilePlaqueProps) {
  if (!name) return null;

  // div/span (not h2/p) so the global h2/p !important type rules don't distort
  // the scale — same approach as the MyHub profile card this now matches.
  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl border-2 border-orange-200 shadow-kampung overflow-hidden">
        {/* Header: avatar + identity + rating + bio + certificates */}
        <div className="bg-gradient-to-br from-orange-100 to-amber-50 p-4">
          <div className="flex gap-3 items-center">
            {/* Avatar */}
            <div className="shrink-0">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md ring-2 ring-errandify-orange/40"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-errandify-orange to-orange-400 flex items-center justify-center text-2xl shadow-md ring-2 ring-white">
                  {gender === 'F' ? '👩' : '👨'}
                </div>
              )}
            </div>

            {/* Name + rating */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black text-errandify-brown truncate leading-tight">{alias || name}</span>
                {gender && <span className="text-sm shrink-0">{gender === 'F' ? '👩' : '👨'}</span>}
              </div>
              {reviewCount > 0 ? (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-sm leading-none">⭐</span>
                  <span className="text-base font-black text-errandify-orange-deep leading-none">{averageRating.toFixed(1)}</span>
                  <span className="text-xs font-semibold text-gray-500">· {reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
                </div>
              ) : (
                <div className="text-xs font-semibold text-gray-500 mt-1">No reviews yet</div>
              )}
            </div>
          </div>

          {/* Bio */}
          {bio && (
            <div className="text-[13px] text-gray-600 italic mt-3 line-clamp-2 leading-snug">"{bio}"</div>
          )}

          {/* Certificates — themed chips (were green) */}
          {certificates && certificates.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {certificates.map((cert, idx) => {
                const certTitle = cert.title || (cert as any).name || 'Certificate';
                const shortName = certTitle.split(' - ')[0];
                return (
                  <span key={idx} className="bg-white text-errandify-orange-deep border border-orange-200 text-[11px] px-2.5 py-1 rounded-full font-bold shadow-sm">
                    🎓 {shortName}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 divide-x divide-orange-100 border-t border-orange-100">
          <div className="py-3 text-center">
            <div className="text-base font-black text-errandify-brown leading-none">{trustedCount}</div>
            <div className="text-[11px] font-semibold text-gray-500 mt-1">❤️ Trusted</div>
          </div>
          <div className="py-3 text-center">
            <div className="text-base font-black text-errandify-brown leading-none">{completedTasks}</div>
            <div className="text-[11px] font-semibold text-gray-500 mt-1">💪 Completed</div>
          </div>
          <div className="py-3 text-center">
            <div className="text-base font-black text-errandify-brown leading-none">{postedTasks}</div>
            <div className="text-[11px] font-semibold text-gray-500 mt-1">📋 Posted</div>
          </div>
        </div>
      </div>
    </div>
  );
}
