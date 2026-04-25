import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceRecorderProps {
  onRecordingComplete: (blobs: Blob[]) => void;
}

export function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<{blob: Blob, url: string}[]>([]);
  const [volume, setVolume] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Set up Audio Context and Analyser for visualization
      audioContextRef.current = new window.AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const updateVolume = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const average = sum / dataArray.length;
        setVolume(Math.min(100, Math.round((average / 255) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      
      updateVolume();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const newRecordings = [...recordings, {blob, url: URL.createObjectURL(blob)}];
        setRecordings(newRecordings);
        onRecordingComplete(newRecordings.map(r => r.blob));
        stream.getTracks().forEach(track => track.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();
        setVolume(0);
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

  const deleteRecording = (index: number) => {
    const newRecordings = [...recordings];
    newRecordings.splice(index, 1);
    setRecordings(newRecordings);
    onRecordingComplete(newRecordings.map(r => r.blob));
  };
  
  useEffect(() => {
    return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close().catch(()=>{});
    }
  }, []);

  return (
    <div className="geo-card p-6 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--geo-green)] opacity-10 -mr-8 -mt-8 rotate-45"></div>
      <div className="text-center z-10 w-full">
        <h3 className="text-xl font-bold text-black">اشرح المشكلة بصوتك</h3>
        <p className="text-sm font-bold text-gray-500 mb-4">تحدث بلهجتك، نحن نسمعك. يمكنك تسجيل أكثر من مقطع.</p>
        
        {recordings.length > 0 && (
            <div className="space-y-3 mb-6 w-full">
                {recordings.map((rec, i) => (
                    <div key={i} className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-gray-600 text-right">مقطع {i + 1}</span>
                        <div className="flex items-center gap-2 w-full bg-gray-50 border-2 border-[var(--geo-border)] p-2">
                            <audio src={rec.url} controls className="flex-1 h-8" />
                            <button
                                onClick={() => deleteRecording(i)}
                                className="p-2 text-white bg-red-600 border-2 border-red-600 hover:bg-red-700 transition-colors"
                            >
                                <Trash2 size={16} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        <div className="relative flex justify-center items-center w-full mt-4">
          {/* Visualizer rings */}
          {isRecording && (
              <div 
                className="absolute rounded-full border-4 border-red-500/30 transition-all duration-75"
                style={{ 
                    width: `${130 + volume}px`, 
                    height: `${130 + volume}px`,
                    opacity: 0.5 + (volume/200)
                }}
              />
          )}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            id="mic-button"
            className={`geo-button-record w-32 h-32 rounded-full flex flex-col items-center justify-center gap-2 z-10 relative ${
              isRecording ? 'is-recording bg-red-600' : ''
            }`}
          >
            {isRecording ? <Square className="text-white w-8 h-8" /> : <Mic className="text-white w-10 h-10" />}
            {!isRecording && <span className="font-black text-sm">{recordings.length > 0 ? 'إضافة مقطع آخر' : 'اضغط وسجل'}</span>}
          </button>
        </div>

        {isRecording && (
          <div className="text-red-500 font-bold flex items-center justify-center gap-2 mt-4 z-10">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            جاري التسجيل...
          </div>
        )}
      </div>
    </div>
  );
}
