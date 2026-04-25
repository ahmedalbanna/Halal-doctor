import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
}

export function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        onRecordingComplete(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('لا يمكن الوصول إلى الميكروفون. يرجى التأكد من الأذونات.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-green-50 rounded-2xl border-2 border-green-100 shadow-sm transition-all hover:shadow-md">
      <div className="text-center mb-2">
        <h3 className="text-lg font-bold text-green-800">اشرح المشكلة بصوتك</h3>
        <p className="text-sm text-green-600">اضغط على الميكرفون وابدأ الكلام</p>
      </div>

      {!audioUrl ? (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={isRecording ? stopRecording : startRecording}
          id="mic-button"
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
            isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isRecording ? <Square className="text-white w-8 h-8" /> : <Mic className="text-white w-10 h-10" />}
        </motion.button>
      ) : (
        <div className="flex items-center gap-4 w-full">
          <audio src={audioUrl} controls className="flex-1 h-10" />
          <button
            onClick={deleteRecording}
            className="p-3 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>
      )}

      {isRecording && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-500 font-medium flex items-center gap-2"
        >
          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
          جاري التسجيل...
        </motion.div>
      )}
    </div>
  );
}
