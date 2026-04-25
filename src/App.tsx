/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, auth, storage, OperationType, handleFirestoreError } from './lib/firebase';
import { signInAnonymously, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { VoiceRecorder } from './components/VoiceRecorder';
import { PhotoUpload } from './components/PhotoUpload';
import { BottomNav } from './components/BottomNav';
import { ANIMAL_TYPES, SYMPTOMS, Case, AnimalType, User } from './types';
import { analyzeSymptoms } from './services/aiService';
import { AlertCircle, CheckCircle2, ChevronRight, Stethoscope, MessageCircle, PlayCircle, Loader2, ClipboardList, BookOpen } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);
  
  // Submission state
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalType | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Fetch profile
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as User);
        } else {
          // Create default profile
          const newProfile: User = {
            uid: user.uid,
            name: 'مربي حلال',
            role: 'farmer',
            phone: '000000',
            createdAt: Date.now(),
          };
          await setDoc(doc(db, 'users', user.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        signInAnonymously(auth);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'cases'),
      where('farmerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const casesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Case[];
      setCases(casesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'cases');
    });

    return () => unsubscribe();
  }, [user]);

  const handleSubmitCase = async () => {
    if (!user || !selectedAnimal) return;
    setIsSubmitting(true);

    try {
      let voiceUrl = '';
      let imageUrl = '';

      if (voiceBlob) {
        const voiceRef = ref(storage, `voices/${user.uid}_${Date.now()}.webm`);
        await uploadBytes(voiceRef, voiceBlob);
        voiceUrl = await getDownloadURL(voiceRef);
      }

      if (photoFile) {
        const photoRef = ref(storage, `photos/${user.uid}_${Date.now()}_${photoFile.name}`);
        await uploadBytes(photoRef, photoFile);
        imageUrl = await getDownloadURL(photoRef);
      }

      const caseData = {
        farmerId: user.uid,
        animalType: selectedAnimal,
        symptoms: selectedSymptoms,
        voiceUrl,
        imageUrl,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await addDoc(collection(db, 'cases'), caseData);

      // Get AIService advice
      const advice = await analyzeSymptoms(
        ANIMAL_TYPES.find(t => t.id === selectedAnimal)?.name || selectedAnimal,
        selectedSymptoms.map(s => SYMPTOMS.find(sym => sym.id === s)?.name || s)
      );
      setAiAdvice(advice);

      // Reset form
      setSelectedAnimal(null);
      setSelectedSymptoms([]);
      setVoiceBlob(null);
      setPhotoFile(null);
      setActiveTab('cases');
    } catch (err) {
      console.error('Submission error:', err);
      alert('عذراً، حدث خطأ أثناء إرسال البلاغ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28 font-sans">
      {/* Header */}
      <header className="bg-green-700 text-white p-6 rounded-b-[2rem] shadow-lg sticky top-0 z-40">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div>
            <h1 className="text-2xl font-bold">طبيب الحلال</h1>
            <p className="text-green-100 text-sm">مرحباً بك، {profile?.name}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-full backdrop-blur-md">
            <Stethoscope className="w-6 h-6" />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Animal Type Selection */}
              <section className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <div className="w-2 h-6 bg-green-600 rounded-full" />
                  أي حيوان مريض؟
                </h2>
                <div className="grid grid-cols-4 gap-3">
                  {ANIMAL_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedAnimal(type.id)}
                      className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${
                        selectedAnimal === type.id 
                        ? 'border-green-600 bg-green-50 shadow-inner' 
                        : 'border-white bg-white hover:border-green-100'
                      }`}
                    >
                      <span className="text-3xl mb-1">{type.icon}</span>
                      <span className="text-[10px] font-bold text-gray-700">{type.name}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Only show rest if animal is selected */}
              {selectedAnimal && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-8"
                >
                  <VoiceRecorder onRecordingComplete={setVoiceBlob} />
                  
                  <div className="grid grid-cols-1 gap-4">
                    <PhotoUpload onPhotoSelected={setPhotoFile} />
                  </div>

                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-800">الأعراض الظاهرة</h2>
                    <div className="flex flex-wrap gap-2">
                      {SYMPTOMS.map((sym) => (
                        <button
                          key={sym.id}
                          onClick={() => toggleSymptom(sym.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                            selectedSymptoms.includes(sym.id)
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-600 border-gray-200'
                          }`}
                        >
                          <span>{sym.icon}</span>
                          {sym.name}
                        </button>
                      ))}
                    </div>
                  </section>

                  <button
                    onClick={handleSubmitCase}
                    disabled={isSubmitting || (!voiceBlob && selectedSymptoms.length === 0)}
                    className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl transition-all ${
                      isSubmitting 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-700 text-white hover:bg-green-800 active:scale-95'
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin" />
                        جاري الإرسال...
                      </div>
                    ) : 'أرسل البلاغ للطوارئ'}
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'cases' && (
            <motion.div
              key="cases"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold text-gray-800">سجل الاستشارات</h2>
              
              {aiAdvice && (
                <div className="bg-amber-50 border-r-4 border-amber-500 p-4 rounded-lg mb-6">
                  <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
                    <AlertCircle size={18} />
                    نصيحة أولية من "طبيب الحلال الذكي":
                  </div>
                  <p className="text-amber-900 text-sm leading-relaxed">{aiAdvice}</p>
                </div>
              )}

              {cases.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardList className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">لا توجد حالات مسجلة بعد</p>
                </div>
              ) : (
                cases.map((c) => (
                  <div key={c.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl">
                          {ANIMAL_TYPES.find(t => t.id === c.animalType)?.icon || '🐾'}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">{ANIMAL_TYPES.find(t => t.id === c.animalType)?.name}</h3>
                          <p className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleDateString('ar-YE')}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        c.status === 'responded' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {c.status === 'responded' ? 'تم الرد' : 'قيد الانتظار'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {c.symptoms.map(s => (
                        <span key={s} className="bg-gray-50 text-[10px] px-2 py-1 rounded-md text-gray-500 border border-gray-100">
                          {SYMPTOMS.find(sym => sym.id === s)?.name || s}
                        </span>
                      ))}
                    </div>

                    {c.imageUrl && (
                      <img src={c.imageUrl} className="w-full h-32 object-cover rounded-xl mb-4" />
                    )}

                    {c.vetVoiceResponseUrl && (
                      <div className="bg-green-50 p-4 rounded-xl flex items-center gap-4">
                        <PlayCircle className="text-green-600 shrink-0" size={32} />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-green-800 mb-1">رد الطبيب الصوتي:</p>
                          <audio src={c.vetVoiceResponseUrl} controls className="w-full h-8" />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'records' && (
            <div className="text-center py-20">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">سجل الحلال</h2>
              <p className="text-gray-500">قريباً.. تتبع تاريخ كل حيوان لديك بالتفاصيل.</p>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
               <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-3xl">👤</div>
                    <div>
                        <h2 className="text-xl font-bold">{profile?.name}</h2>
                        <p className="text-gray-500">{profile?.role === 'farmer' ? 'مربي' : 'طبيب بيطري'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl text-sm">
                        <span className="text-gray-500">رقم الهاتف</span>
                        <span className="font-bold">{profile?.phone}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl text-sm">
                        <span className="text-gray-500">الموقع</span>
                        <span className="font-bold">وادي حضرموت</span>
                    </div>
                  </div>
               </div>
               
               <button 
                 onClick={() => auth.signOut()}
                 className="w-full p-4 text-red-600 font-bold border-2 border-red-100 rounded-2xl hover:bg-red-50 transition-colors"
               >
                 تسجيل الخروج
               </button>
            </div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

