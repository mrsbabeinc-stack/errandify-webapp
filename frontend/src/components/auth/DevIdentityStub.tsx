import { useState } from 'react';

interface MockUserData {
  name: string;
  age: number;
  nric: string;
  address: string;
}

interface DevIdentityStubProps {
  onComplete: (data: MockUserData) => void;
  onBack: () => void;
}

const MOCK_PERSONAS: Record<string, MockUserData> = {
  persona1: {
    name: 'Tan Wei Ming',
    age: 51,
    nric: 'S1234567A',
    address: '123 Clementi Road, Singapore 129742',
  },
  persona2: {
    name: 'Siti Rahimah',
    age: 35,
    nric: 'S9876543B',
    address: '456 Woodlands Avenue, Singapore 730456',
  },
  persona3: {
    name: 'Ravi Kumar',
    age: 28,
    nric: 'S5555555C',
    address: '789 Geylang Lorong 5, Singapore 388161',
  },
};

export default function DevIdentityStub({
  onComplete,
  onBack,
}: DevIdentityStubProps) {
  const [mode, setMode] = useState<'select' | 'custom'>('select');
  const [selectedPersona, setSelectedPersona] = useState('persona1');
  const [customData, setCustomData] = useState<MockUserData>({
    name: '',
    age: 30,
    nric: '',
    address: '',
  });

  const handleContinue = () => {
    if (mode === 'select') {
      onComplete(MOCK_PERSONAS[selectedPersona]);
    } else {
      if (customData.name.trim() && customData.nric.trim()) {
        onComplete(customData);
      }
    }
  };

  const isCustomValid =
    mode === 'custom' &&
    customData.name.trim() &&
    customData.nric.trim() &&
    customData.address.trim();

  // Hard stop: this component must never render in production, whatever routes
  // or feature flags say. A fake identity screen in production is a way in.
  if (import.meta.env.PROD) {
    console.error('[DevIdentityStub] Refused to render in a production build.');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-lg p-6 border-4 border-dashed border-amber-500">
        {/* Deliberately does NOT resemble Singpass. Real identity is verified on
            Singpass's own screen, on their domain — anything here that looked
            official would be teaching people to trust a lookalike. */}
        <div className="mb-6">
          <div className="bg-amber-100 border border-amber-400 rounded px-3 py-2 mb-3">
            <p className="text-xs font-bold text-amber-900 tracking-wide">
              ⚠ DEVELOPER TEST STUB — NOT SINGPASS
            </p>
            <p className="text-[11px] text-amber-800 mt-1">
              Fake identity for local testing. Real sign-in happens on Singpass's
              own website. This screen never appears in production.
            </p>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Pick a test identity</h2>
          <p className="text-sm text-gray-600">
            Choose a persona or type your own. Nothing here is verified.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setMode('select')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              mode === 'select'
                ? 'bg-errandify-orange text-white'
                : 'bg-gray-200 text-errandify-brown hover:bg-gray-300'
            }`}
          >
            Select Persona
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              mode === 'custom'
                ? 'bg-errandify-orange text-white'
                : 'bg-gray-200 text-errandify-brown hover:bg-gray-300'
            }`}
          >
            Custom
          </button>
        </div>

        {/* Persona Selection */}
        {mode === 'select' && (
          <div className="space-y-3 mb-6">
            {Object.entries(MOCK_PERSONAS).map(([key, persona]) => (
              <label
                key={key}
                className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors"
                style={{
                  borderColor:
                    selectedPersona === key ? '#FF7A29' : '#E5E5E5',
                  backgroundColor:
                    selectedPersona === key ? '#FFF5F0' : 'white',
                }}
              >
                <input
                  type="radio"
                  name="persona"
                  value={key}
                  checked={selectedPersona === key}
                  onChange={(e) => setSelectedPersona(e.target.value)}
                  className="w-4 h-4"
                />
                <div>
                  <p className="font-semibold text-errandify-brown">
                    {persona.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    Age {persona.age} · {persona.nric}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Custom Entry */}
        {mode === 'custom' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-errandify-brown mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={customData.name}
                onChange={(e) =>
                  setCustomData({ ...customData, name: e.target.value })
                }
                placeholder="e.g. Tan Wei Ming"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-errandify-brown mb-1">
                Age
              </label>
              <input
                type="number"
                value={customData.age}
                onChange={(e) =>
                  setCustomData({
                    ...customData,
                    age: parseInt(e.target.value, 10),
                  })
                }
                min="18"
                max="120"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-errandify-brown mb-1">
                NRIC
              </label>
              <input
                type="text"
                value={customData.nric}
                onChange={(e) =>
                  setCustomData({ ...customData, nric: e.target.value })
                }
                placeholder="Test NRIC/FIN — not verified"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-errandify-brown mb-1">
                Address
              </label>
              <input
                type="text"
                value={customData.address}
                onChange={(e) =>
                  setCustomData({ ...customData, address: e.target.value })
                }
                placeholder="e.g. 123 Clementi Road, Singapore 129742"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 px-4 border-2 border-gray-300 text-errandify-brown rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleContinue}
            disabled={mode === 'custom' && !isCustomValid}
            className="flex-1 py-3 px-4 bg-errandify-orange text-white rounded-lg font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
