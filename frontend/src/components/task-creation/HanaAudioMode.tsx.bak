import { useState, useRef } from 'react';
import axios from 'axios';
import { TaskData } from '../../pages/HanaTaskCreationPage';

interface HanaAudioModeProps {
  taskData: TaskData;
  onTaskUpdate: (updates: Partial<TaskData>) => void;
  onReview: () => void;
}

export default function HanaAudioMode({
  taskData,
  onTaskUpdate,
  onReview,
}: HanaAudioModeProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcription, setTranscription] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscribeAndExtract = async () => {
    if (!audioBlob) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      // Send to backend for transcription and extraction
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/transcribe-and-extract`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      const { title, description, location, date, time, budget, category } =
        response.data.data;

      setTranscription(description);
      onTaskUpdate({
        title: title || taskData.title,
        description: description || taskData.description,
        location: location || taskData.location,
        date: date || taskData.date,
        time: time || taskData.time,
        budget: budget?.toString() || taskData.budget,
        category: category || taskData.category,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to transcribe audio');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAudioBlob(null);
    setTranscription('');
    audioChunksRef.current = [];
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Recording Interface */}
      {!audioBlob ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-8">
            Tap the microphone and tell us what you need done. Be as detailed as possible!
          </p>

          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 mx-auto transition-all ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 shadow-lg animate-pulse'
                : 'bg-errandify-orange hover:bg-opacity-90'
            }`}
          >
            <span className="text-5xl">{isRecording ? '⏹️' : '🎤'}</span>
          </button>

          {isRecording && <p className="text-red-600 font-semibold">Recording...</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Transcription Display */}
          {transcription && (
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-gray-600 mb-2">Transcription:</p>
              <p className="text-gray-700 whitespace-pre-wrap">{transcription}</p>
            </div>
          )}

          {/* Extracted Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Title
              </label>
              <input
                type="text"
                value={taskData.title}
                onChange={(e) => onTaskUpdate({ title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Description
              </label>
              <textarea
                value={taskData.description}
                onChange={(e) => onTaskUpdate({ description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={taskData.location}
                  onChange={(e) => onTaskUpdate({ location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Budget (SGD)
                </label>
                <input
                  type="number"
                  value={taskData.budget}
                  onChange={(e) => onTaskUpdate({ budget: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={taskData.date}
                  onChange={(e) => onTaskUpdate({ date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={taskData.time}
                  onChange={(e) => onTaskUpdate({ time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onReview}
              className="flex-1 bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90"
            >
              Review & Post
            </button>
            <button
              onClick={handleReset}
              className="flex-1 border border-gray-300 py-3 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
            >
              Record Again
            </button>
          </div>
        </div>
      )}

      {audioBlob && !transcription && (
        <button
          onClick={handleTranscribeAndExtract}
          disabled={loading}
          className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Transcribe & Extract'}
        </button>
      )}
    </div>
  );
}
