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
  console.log('ProfilePlaque data:', { name, gender, bio, certificates, profileImage, role });

  if (!name) return null;

  return (
    <div className="w-full">
      {/* Compact Happy Plaque Design */}
      <div className="relative bg-gradient-to-r from-amber-100 to-yellow-100 rounded-2xl shadow-lg border-4 border-amber-300 p-4 overflow-hidden">

        {/* Decorative corner sparkles */}
        <div className="absolute top-2 left-2 text-lg">✨</div>
        <div className="absolute top-2 right-2 text-lg">✨</div>

        {/* Main Content - Horizontal Layout */}
        <div className="flex gap-3 items-start">
          {/* Left: Photo & Name */}
          <div className="flex-shrink-0">
            {profileImage ? (
              <img
                src={profileImage}
                alt={name}
                className="w-16 h-16 rounded-full border-3 border-amber-300 object-cover shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-2xl shadow-md border-3 border-amber-300">
                {gender === 'F' ? '👩' : '👨'}
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div className="flex-1 min-w-0">
            {/* Alias & Rating */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <h2 className="text-lg font-bold text-amber-900">{alias || name}</h2>
                {gender && <span className="text-sm">{gender === 'F' ? '👩' : '👨'}</span>}
              </div>
              {reviewCount > 0 && (
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-amber-900">⭐ {averageRating.toFixed(1)}</p>
                  <p className="text-xs text-amber-700">{reviewCount} review{reviewCount !== 1 ? 's' : ''}</p>
                </div>
              )}
            </div>

            {/* Bio - Truncated */}
            {bio && (
              <p className="text-xs text-amber-800 line-clamp-2 mb-2 italic">
                "{bio}"
              </p>
            )}

            {/* Certificates - Inline */}
            {certificates && certificates.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {certificates.map((cert, idx) => {
                  const certTitle = cert.title || cert.name || 'Certificate';
                  const shortName = certTitle.split(' - ')[0];
                  return (
                    <span key={idx} className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full font-semibold">
                      🎓 {shortName}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Stats Row - Bottom */}
        <div className="mt-3 pt-3 border-t border-amber-300 flex justify-around text-center">
          <div className="flex-1 group relative cursor-help">
            <p className="text-sm font-bold text-errandify-orange">{trustedCount}</p>
            <p className="text-xs text-amber-800">❤️ Trusted User</p>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
              Users who trust this person
            </div>
          </div>
          <div className="flex-1 border-l border-amber-300 group relative cursor-help">
            <p className="text-sm font-bold text-errandify-orange">{completedTasks}</p>
            <p className="text-xs text-amber-800">💪 Completed</p>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
              Errands completed successfully
            </div>
          </div>
          <div className="flex-1 border-l border-amber-300 group relative cursor-help">
            <p className="text-sm font-bold text-errandify-orange">{postedTasks}</p>
            <p className="text-xs text-amber-800">📋 Posted</p>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
              Errands posted by this person
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
