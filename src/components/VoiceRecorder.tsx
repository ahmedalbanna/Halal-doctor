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
    <div className="geo-card p-10 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--geo-green)] opacity-10 -mr-8 -mt-8 rotate-45"></div>
      <div className="text-center z-10">
        <h3 className="text-xl font-bold text-black">اشرح المشكلة بصوتك</h3>
        <p className="text-sm font-bold text-gray-500">تحدث بلهجتك، نحن نسمعك</p>
      </div>

      {!audioUrl ? (
        <button
          onClick={isRecording ? stopRecording : startRecording}
          id="mic-button"
          className={`geo-button-record w-32 h-32 rounded-full flex flex-col items-center justify-center gap-2 z-10 ${
            isRecording ? 'is-recording bg-red-600' : ''
          }`}
        >
          {isRecording ? <Square className="text-white w-8 h-8" /> : <Mic className="text-white w-10 h-10" />}
          {!isRecording && <span className="font-black text-sm">اضغط وسجل</span>}
        </button>
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
        <div className="text-red-500 font-bold flex items-center gap-2 mt-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
          جاري التسجيل...
        </div>
      )}
    </div>
  );
}
