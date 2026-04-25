/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, auth, storage, OperationType, handleFirestoreError } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { VoiceRecorder } from './components/VoiceRecorder';
import { PhotoUpload } from './components/PhotoUpload';
import { BottomNav } from './components/BottomNav';
import { ANIMAL_TYPES, SYMPTOMS_GROUPS, Case, AnimalType, User, Animal } from './types';
import { analyzeSymptoms, getPreventativeTips, getPrescriptionSuggestions } from './services/aiService';
import { AlertCircle, CheckCircle2, ChevronRight, Stethoscope, MessageCircle, PlayCircle, Loader2, ClipboardList, BookOpen, Plus, Activity } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  
  // Submission state
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalType | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [voiceBlobs, setVoiceBlobs] = useState<Blob[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  
  const [preventativeTip, setPreventativeTip] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Vet state
  const [prescriptionInputs, setPrescriptionInputs] = useState<Record<string, string>>({});

  // Animal Records state
  const [newAnimalName, setNewAnimalName] = useState('');
  const [newAnimalType, setNewAnimalType] = useState<AnimalType>('sheep');
  const [isAddingAnimal, setIsAddingAnimal] = useState(false);
  const [selectedAnimalForRecords, setSelectedAnimalForRecords] = useState<Animal | null>(null);
  const [newVacName, setNewVacName] = useState('');
  const [newVacDate, setNewVacDate] = useState('');

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
            name: user.displayName || 'مربي',
            role: 'farmer',
            phone: user.phoneNumber || '000000',
            createdAt: Date.now(),
          };
          await setDoc(doc(db, 'users', user.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
      alert('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    }
  };

  useEffect(() => {
    if (!user || !profile) return;

    let q;
    if (profile.role === 'vet') {
      q = query(collection(db, 'cases'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'cases'), where('farmerId', '==', user.uid), orderBy('createdAt', 'desc'));
    }

    const unsubscribeCases = onSnapshot(q, (snapshot) => {
      const casesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Case[];
      setCases(casesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'cases');
    });

    const qAnimals = query(collection(db, `users/${user.uid}/animals`), orderBy('createdAt', 'desc'));
    const unsubscribeAnimals = onSnapshot(qAnimals, (snapshot) => {
      const animalsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Animal[];
      setAnimals(animalsData);
    }, (error) => {});

    return () => {
        unsubscribeCases();
        unsubscribeAnimals();
    };
  }, [user, profile]);

  useEffect(() => {
    if (selectedAnimal) {
        setPreventativeTip(null);
        getPreventativeTips(ANIMAL_TYPES.find(t => t.id === selectedAnimal)?.name || '').then(tip => {
            setPreventativeTip(tip);
        });
    }
  }, [selectedAnimal]);

  const toggleRole = async () => {
    if (!user || !profile) return;
    const newRole = profile.role === 'farmer' ? 'vet' : 'farmer';
    await updateDoc(doc(db, 'users', user.uid), { role: newRole });
    setProfile({ ...profile, role: newRole });
    setActiveTab(newRole === 'vet' ? 'cases' : 'home');
  };

  const handleAddAnimal = async () => {
    if (!user || !newAnimalName.trim()) return;
    try {
        await addDoc(collection(db, `users/${user.uid}/animals`), {
            ownerId: user.uid,
            name: newAnimalName,
            type: newAnimalType,
            healthHistory: [],
            createdAt: Date.now()
        });
        setNewAnimalName('');
        setIsAddingAnimal(false);
    } catch(err) {
        console.error(err);
        alert('حدث خطأ');
    }
  };

  const handleAddVaccination = async () => {
      if (!user || !selectedAnimalForRecords || !newVacName || !newVacDate) return;
      try {
          const newVac = {
              name: newVacName,
              administeredAt: Date.now(),
              nextDueDate: new Date(newVacDate).getTime()
          };
          const updatedVaccinations = [...(selectedAnimalForRecords.vaccinations || []), newVac];
          await updateDoc(doc(db, `users/${user.uid}/animals`, selectedAnimalForRecords.id!), {
              vaccinations: updatedVaccinations
          });
          setNewVacName('');
          setNewVacDate('');
          setSelectedAnimalForRecords({...selectedAnimalForRecords, vaccinations: updatedVaccinations});
      } catch (err) {
          console.error(err);
      }
  };

  const submitPrescription = async (caseId: string) => {
      if (!user) return;
      const prescription = prescriptionInputs[caseId];
      if (!prescription) return;

      try {
          await updateDoc(doc(db, 'cases', caseId), {
              status: 'responded',
              vetId: user.uid,
              prescription,
              updatedAt: Date.now()
          });
          setPrescriptionInputs(prev => ({...prev, [caseId]: ''}));
          alert('تم إرسال الوصفة للراعي');
      } catch (err) {
          console.error(err);
      }
  };

  const handleConfirmSubmit = () => {
      setShowConfirmDialog(true);
  };

  const executeSubmit = async () => {
    setShowConfirmDialog(false);
    if (!user || !selectedAnimal) return;
    setIsSubmitting(true);

    try {
      let voiceUrls: string[] = [];
      let imageUrl = '';

      if (voiceBlobs.length > 0) {
        for(let i=0; i<voiceBlobs.length; i++) {
            const voiceRef = ref(storage, `voices/${user.uid}_${Date.now()}_${i}.webm`);
            await uploadBytes(voiceRef, voiceBlobs[i]);
            voiceUrls.push(await getDownloadURL(voiceRef));
        }
      }

      if (photoFile) {
        const photoRef = ref(storage, `photos/${user.uid}_${Date.now()}_${photoFile.name}`);
        await uploadBytes(photoRef, photoFile);
        imageUrl = await getDownloadURL(photoRef);
      }

      const caseData: any = {
        farmerId: user.uid,
        animalType: selectedAnimal,
        symptoms: selectedSymptoms,
        voiceUrls,
        imageUrl,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      if (customSymptom.trim()) {
          caseData.customSymptoms = customSymptom.trim();
      }

      await addDoc(collection(db, 'cases'), caseData);

      // Get AIService advice
      const adviceResult = await analyzeSymptoms(
        ANIMAL_TYPES.find(t => t.id === selectedAnimal)?.name || selectedAnimal,
        selectedSymptoms.map(s => SYMPTOMS_GROUPS.flatMap(g => g.symptoms).find(sym => sym.id === s)?.name || s),
        customSymptom,
        photoFile,
        voiceBlobs.length > 0 ? voiceBlobs[0] : null
      );
      
      setAiAdvice(adviceResult.farmerAdvice);
      
      if (adviceResult.differentialDiagnosis) {
          await updateDoc(doc(db, 'cases', (await getDoc(collection(db, 'cases').docs[0].ref)).id), {
             differentialDiagnosis: adviceResult.differentialDiagnosis
          }).catch(()=>{}); // Ignoring failure on immediate update for simplicity
      }

      // Reset form
      setSelectedAnimal(null);
      setSelectedSymptoms([]);
      setCustomSymptom('');
      setVoiceBlobs([]);
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--geo-bg)]">
        <Loader2 className="w-10 h-10 text-[var(--geo-green)] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--geo-bg)] flex flex-col items-center justify-center p-6">
        <div className="geo-card p-10 max-w-sm w-full flex flex-col items-center gap-8 shadow-[8px_8px_0_0_var(--geo-border)]">
          <div className="w-24 h-24 bg-[var(--geo-green)] rounded-lg flex items-center justify-center text-white text-5xl font-black shadow-[4px_4px_0_0_black]">H</div>
          <div className="text-center">
            <h1 className="text-3xl font-black mb-2">طبيب الحلال</h1>
            <p className="text-gray-500 font-bold">بوابتك لخدمات الطب البيطري الذكي في اليمن</p>
          </div>
          <button
            onClick={handleGoogleLogin}
            className="geo-button-primary w-full py-4 bg-white text-black font-black flex items-center justify-center gap-3 hover:bg-gray-50"
          >
            <div className="w-6 h-6 bg-red-500 rounded-sm" />
            تسجيل الدخول عبر جوجل
          </button>
          <p className="text-[10px] text-gray-400 font-bold text-center">
            بالدخول للتطبيق، أنت توافق على شروط الخدمة وتوفير رعاية أفضل لحلالك
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--geo-bg)] pb-28">
      {/* Header */}
      <header className="flex justify-between items-center border-b-4 border-black pb-4 pt-6 px-6 bg-[var(--geo-bg)] sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[var(--geo-green)] rounded-lg flex items-center justify-center text-white text-2xl font-black shadow-[4px_4px_0_0_black]">H</div>
          <h1 className="text-2xl font-black tracking-tight text-black">طبيب الحلال</h1>
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-xs font-bold bg-[var(--geo-yellow)] border-2 border-[var(--geo-border)] px-2 py-1 truncate max-w-[80px]">مرحباً، {profile?.name?.split(' ')[0] || ''}</span>
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && profile?.role === 'farmer' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Confirm Dialog */}
              {showConfirmDialog && (
                 <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="geo-card p-6 w-full max-w-sm">
                        <h3 className="text-xl font-black mb-4">هل أنت متأكد من الإرسال؟</h3>
                        <p className="text-gray-600 font-bold mb-6">سيتم إرسال بلاغك للطبيب المتوفر حالياً.</p>
                        <div className="flex gap-4">
                            <button onClick={executeSubmit} className="geo-card flex-1 p-3 bg-green-600 text-white font-bold hover:bg-green-700">تأكيد وإرسال</button>
                            <button onClick={() => setShowConfirmDialog(false)} className="geo-card flex-1 p-3 bg-gray-100 font-bold hover:bg-gray-200">إلغاء</button>
                        </div>
                    </div>
                 </div>
              )}

              {/* Animal Type Selection */}
              <section className="space-y-4">
                <h2 className="text-lg font-black text-black flex items-center gap-2">
                  <div className="w-2 h-6 bg-[var(--geo-green)] rounded-sm" />
                  أي حلالك مريض؟
                </h2>
                <div className="grid grid-cols-4 gap-3">
                  {ANIMAL_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedAnimal(type.id)}
                      className={`geo-card p-2 flex flex-col items-center gap-2 hover:bg-green-50 ${
                        selectedAnimal === type.id 
                        ? 'bg-green-50 border-green-800' 
                        : ''
                      }`}
                    >
                      <div className="icon-circle bg-white text-2xl">{type.icon}</div>
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
                  className="space-y-8 overflow-hidden"
                >
                  {preventativeTip && (
                      <div className="geo-card p-4 border-l-8 border-l-[var(--geo-yellow)] bg-yellow-50">
                          <div className="flex items-center gap-2 font-bold mb-1">
                              <Activity size={16} className="text-yellow-700" /> نصيحة اليوم الك:
                          </div>
                          <p className="text-sm font-bold text-gray-700">{preventativeTip}</p>
                      </div>
                  )}

                  <VoiceRecorder onRecordingComplete={setVoiceBlobs} />
                  
                  <div className="grid grid-cols-1 gap-4">
                    <PhotoUpload onPhotoSelected={setPhotoFile} />
                  </div>

                  <section className="space-y-4">
                    <h2 className="text-lg font-black text-black flex items-center gap-2">
                        <div className="w-2 h-6 bg-red-600 rounded-sm" /> الايش تشتكي منه؟
                    </h2>
                    
                    {SYMPTOMS_GROUPS.map((group) => (
                        <div key={group.category} className="mb-4">
                            <h3 className="text-xs font-bold text-gray-500 mb-2">{group.category}</h3>
                            <div className="flex flex-wrap gap-2">
                            {group.symptoms.map((sym) => (
                                <button
                                key={sym.id}
                                onClick={() => toggleSymptom(sym.id)}
                                className={`geo-button-primary flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all ${
                                    selectedSymptoms.includes(sym.id)
                                    ? 'bg-[var(--geo-green)] text-white'
                                    : 'bg-white text-black'
                                }`}
                                >
                                <span>{sym.icon}</span>
                                {sym.name}
                                </button>
                            ))}
                            </div>
                        </div>
                    ))}

                    <div className="mt-4">
                        <h3 className="text-xs font-bold text-gray-500 mb-2">أعراض أخرى (اكتبها بلهجتك)</h3>
                        <textarea 
                            value={customSymptom}
                            onChange={(e) => setCustomSymptom(e.target.value)}
                            placeholder="مثال: البقرة ترفس برجلها وتعيط..."
                            className="geo-card w-full p-4 font-bold text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>
                  </section>

                  <button
                    onClick={handleConfirmSubmit}
                    disabled={isSubmitting || (voiceBlobs.length === 0 && selectedSymptoms.length === 0 && !customSymptom)}
                    className={`geo-card w-full py-4 text-black font-black text-lg flex justify-center items-center gap-3 mb-8 transition-none ${
                      isSubmitting || (voiceBlobs.length === 0 && selectedSymptoms.length === 0 && !customSymptom)
                      ? 'opacity-50 cursor-not-allowed bg-gray-200' 
                      : 'bg-[var(--geo-yellow)] hover:bg-[#e5a500] hover:-translate-y-1 block'
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin" />
                        صبرك علينا...
                      </div>
                    ) : 'دز البلاغ للطبيب'}
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'home' && profile?.role === 'vet' && (
              <div className="text-center py-20">
                  <Stethoscope className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-800 mb-2">عيادة الطبيب</h2>
                  <p className="text-gray-500 font-bold mb-4">انتقل لقسم "حالاتي" لمراجعة بلاغات المربين المفتوحة.</p>
                  <button onClick={() => setActiveTab('cases')} className="geo-button-primary px-6 py-2 bg-[var(--geo-green)] text-white font-bold">عرض الحالات الجديدة</button>
              </div>
          )}

          {activeTab === 'cases' && (
            <motion.div
              key="cases"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-black text-black">
                  {profile?.role === 'vet' ? 'الحالات المفتوحة للمراجعة' : 'حالاتك مع الطبيب'}
              </h2>
              
              {aiAdvice && profile?.role === 'farmer' && (
                <div className="geo-card p-4 border-l-8 border-l-indigo-500 bg-indigo-50 mb-6">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold mb-2">
                    <AlertCircle size={18} />
                    نصيحة سريعة من المساعد الذكي:
                  </div>
                  <p className="text-indigo-900 text-sm leading-relaxed font-bold">{aiAdvice}</p>
                </div>
              )}

              {cases.length === 0 ? (
                <div className="geo-card text-center py-20 bg-white shadow-[4px_4px_0_0_var(--geo-border)]">
                  <div className="bg-gray-100 w-16 h-16 rounded-full border-2 border-[var(--geo-border)] flex items-center justify-center mx-auto mb-4">
                    <ClipboardList className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-bold">لا توجد حالات حالياً</p>
                </div>
              ) : (
                cases.map((c) => (
                  <div key={c.id} className={`geo-card p-4 flex flex-col gap-3 border-r-8 ${c.status === 'responded' ? 'border-r-green-500' : 'border-r-red-500'} shadow-[4px_4px_0_0_var(--geo-border)]`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white border-2 border-[var(--geo-border)] rounded-full flex items-center justify-center text-xl">
                          {ANIMAL_TYPES.find(t => t.id === c.animalType)?.icon || '🐾'}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">{ANIMAL_TYPES.find(t => t.id === c.animalType)?.name}</h3>
                          <p className="text-[10px] font-bold text-gray-400">{new Date(c.createdAt).toLocaleDateString('ar-YE')}</p>
                        </div>
                      </div>
                      <span className={`status-badge text-xs ${
                        c.status === 'responded' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {c.status === 'responded' ? 'تم الرد' : 'مستعجلة'}
                      </span>
                    </div>

                    {(c.symptoms.length > 0 || c.customSymptoms) && (
                        <div className="flex flex-wrap gap-1 mb-2">
                        {c.symptoms.map(s => (
                            <span key={s} className="bg-gray-100 text-[10px] px-2 py-1 font-bold text-black border border-[var(--geo-border)]">
                            {SYMPTOMS_GROUPS.flatMap(g => g.symptoms).find(sym => sym.id === s)?.name || s}
                            </span>
                        ))}
                        {c.customSymptoms && (
                            <span className="bg-amber-100 text-[10px] px-2 py-1 font-bold text-black border border-[var(--geo-border)]">
                                {c.customSymptoms}
                            </span>
                        )}
                        </div>
                    )}

                    {c.imageUrl && (
                      <img src={c.imageUrl} className="w-full h-40 object-cover border-2 border-[var(--geo-border)] mb-2" />
                    )}

                    {c.voiceUrls && c.voiceUrls.length > 0 && (
                        <div className="flex flex-col gap-2 mb-2">
                        {c.voiceUrls.map((url, i) => (
                            <div key={i} className="bg-gray-50 border-2 border-[var(--geo-border)] p-2 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-600">تسجيل {i + 1}:</span>
                                <audio src={url} controls className="h-8 w-2/3" />
                            </div>
                        ))}
                        </div>
                    )}

                    {c.voiceUrl && !c.voiceUrls && (
                        <div className="bg-gray-50 border-2 border-[var(--geo-border)] p-2 flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-600">شكوى الراعي الصوتية:</span>
                            <audio src={c.voiceUrl} controls className="h-8 w-2/3" />
                        </div>
                    )}

                    {c.prescription && (
                      <div className="bg-green-50 border-2 border-[var(--geo-border)] p-3 flex flex-col gap-2 mt-2">
                        <div className="text-sm font-black text-green-800 flex items-center gap-2">
                             <CheckCircle2 size={16}/> وصفة الطبيب:
                        </div>
                        <p className="text-sm font-bold">{c.prescription}</p>
                      </div>
                    )}

                    {profile?.role === 'vet' && c.status === 'pending' && (
                        <div className="mt-4 border-t-2 border-dashed border-gray-300 pt-4 flex flex-col gap-2">
                            {c.differentialDiagnosis && (
                                <div className="bg-blue-50 border-2 border-blue-200 p-3 mb-2">
                                    <h4 className="text-xs font-black text-blue-900 mb-1">🤖 تشخيص تفريقي مقترح (AI):</h4>
                                    <p className="text-xs font-bold text-blue-800">{c.differentialDiagnosis}</p>
                                </div>
                            )}
                            <h4 className="font-bold text-sm">إضافة وصفة وعلاج:</h4>
                            <textarea 
                                value={prescriptionInputs[c.id] || ''}
                                onChange={(e) => setPrescriptionInputs({...prescriptionInputs, [c.id]: e.target.value})}
                                placeholder="اكتب العلاج والجرعة هنا..."
                                className="geo-card p-3 font-bold text-sm h-20 resize-none focus:outline-none focus:bg-yellow-50"
                            />
                            <button 
                                onClick={async () => {
                                   const suggestions = await getPrescriptionSuggestions(
                                       ANIMAL_TYPES.find(t=>t.id===c.animalType)?.name || '', 
                                       c.symptoms, 
                                       c.differentialDiagnosis
                                   );
                                   setPrescriptionInputs({...prescriptionInputs, [c.id]: suggestions.join('\n')});
                                }}
                                className="geo-button-primary bg-indigo-100 text-indigo-700 p-2 font-bold mt-1 text-xs"
                            >
                                🤖 اقتراح علاجات (AI)
                            </button>
                            <button 
                                onClick={() => submitPrescription(c.id)}
                                className="geo-button-primary bg-[var(--geo-green)] text-white p-2 font-bold mt-2"
                            >
                                اعتماد وإرسال
                            </button>
                        </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'records' && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-black">سجل الحلال</h2>
                    <button 
                        onClick={() => setIsAddingAnimal(!isAddingAnimal)}
                        className="geo-button-primary bg-black text-white p-2 font-bold text-sm flex items-center gap-1"
                    >
                        <Plus size={16} /> إضافة 
                    </button>
                </div>
                
                {isAddingAnimal && !selectedAnimalForRecords && (
                    <div className="geo-card p-4 space-y-4 shadow-[4px_4px_0_0_var(--geo-border)]">
                        <h3 className="font-bold">تسجيل حيوان جديد</h3>
                        <div className="grid grid-cols-4 gap-2">
                          {ANIMAL_TYPES.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setNewAnimalType(type.id)}
                                className={`p-2 border-2 text-center font-bold text-xl ${
                                newAnimalType === type.id ? 'border-black bg-yellow-100' : 'border-gray-200'
                                }`}
                            >
                                {type.icon}
                            </button>
                          ))}
                        </div>
                        <input 
                            type="text" 
                            placeholder="اسم الحيوان أو رقمه بالمزرعة" 
                            value={newAnimalName}
                            onChange={(e) => setNewAnimalName(e.target.value)}
                            className="w-full geo-card p-3 font-bold focus:outline-none focus:bg-gray-50"
                        />
                        <button 
                            onClick={handleAddAnimal}
                            className="w-full geo-button-primary bg-[var(--geo-green)] text-white p-3 font-bold"
                        >
                            حفظ بالسجل
                        </button>
                    </div>
                )}

                {selectedAnimalForRecords ? (
                    <div className="geo-card p-4 space-y-4 shadow-[4px_4px_0_0_var(--geo-border)]">
                        <button onClick={() => setSelectedAnimalForRecords(null)} className="text-xs font-bold text-gray-500 mb-2 font-black">↩ رجوع للقائمة</button>
                        <div className="flex items-center gap-4 border-b-2 border-dashed border-gray-200 pb-4">
                            <div className="text-3xl bg-yellow-100 w-16 h-16 flex items-center justify-center rounded-full border-2 border-[var(--geo-border)]">{ANIMAL_TYPES.find(t=>t.id===selectedAnimalForRecords.type)?.icon}</div>
                            <div>
                                <h3 className="font-black text-xl">{selectedAnimalForRecords.name}</h3>
                                <p className="text-sm text-gray-500 font-bold">{ANIMAL_TYPES.find(t=>t.id===selectedAnimalForRecords.type)?.name}</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-black text-lg mb-2">سجل التطعيمات</h4>
                            {selectedAnimalForRecords.vaccinations && selectedAnimalForRecords.vaccinations.length > 0 ? (
                                <div className="space-y-2 mb-4">
                                {selectedAnimalForRecords.vaccinations.map((vac, i) => (
                                    <div key={i} className="bg-gray-50 border-2 border-[var(--geo-border)] p-3">
                                        <h5 className="font-bold">{vac.name}</h5>
                                        <p className="text-xs text-gray-600 font-bold">تاريخ القادمة: {new Date(vac.nextDueDate).toLocaleDateString()}</p>
                                    </div>
                                ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 font-bold mb-4">لا توجد تطعيمات مسجلة.</p>
                            )}
                            
                            <div className="bg-gray-100 p-3 border-2 border-[var(--geo-border)]">
                                <h5 className="font-bold text-sm mb-2">تسجيل تطعيم جديد:</h5>
                                <input type="text" value={newVacName} onChange={e=>setNewVacName(e.target.value)} placeholder="اسم التطعيم..." className="w-full border-2 border-[var(--geo-border)] p-2 mb-2 text-sm font-bold" />
                                <input type="date" value={newVacDate} onChange={e=>setNewVacDate(e.target.value)} className="w-full border-2 border-[var(--geo-border)] p-2 mb-2 text-sm font-bold" />
                                <button onClick={handleAddVaccination} className="w-full bg-[var(--geo-yellow)] font-bold text-sm p-2 border-2 border-[var(--geo-border)]">إضافة</button>
                            </div>
                        </div>
                    </div>
                ) : animals.length === 0 ? (
                    <div className="geo-card text-center py-20 bg-white">
                        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-bold">السجل فارغ. ابدأ بتسجيل حلالك لمتابعة التطعيمات.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {animals.map((a) => (
                            <div key={a.id} className="geo-card p-4 flex justify-between items-center border-l-8 border-l-indigo-500">
                                <div className="flex items-center gap-4">
                                    <div className="text-3xl">{ANIMAL_TYPES.find(t=>t.id===a.type)?.icon}</div>
                                    <div>
                                        <h4 className="font-bold text-lg">{a.name}</h4>
                                        <p className="text-xs text-gray-500 font-bold">اضيف: {new Date(a.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => {
                                      if(window.confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) {
                                          deleteDoc(doc(db, `users/${user?.uid}/animals`, a.id!));
                                      }
                                  }} className="bg-red-50 text-red-600 px-2 py-1 text-xs border border-red-200">حذف</button>
                                  <button onClick={() => setSelectedAnimalForRecords(a)} className="geo-button-primary bg-white text-xs font-bold p-2">الملف</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
          )}

          {activeTab === 'map' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                  <h2 className="text-xl font-black">الخريطة الوبائية</h2>
                  <div className="geo-card bg-white p-4 shadow-[4px_4px_0_0_var(--geo-border)]">
                      <p className="text-gray-500 font-bold text-sm mb-4">توزع الحالات حسب المناطق (تجريبي)</p>
                      
                      {/* Simple mock SVG map of Yemeni Regions */}
                      <div className="relative w-full h-64 bg-blue-50 border-2 border-[var(--geo-border)] overflow-hidden flex items-center justify-center">
                          <span className="text-xl font-black text-blue-200 absolute rotate-[-45deg] scale-150">YEMEN MAP</span>
                          
                          <div className="absolute top-1/4 left-1/4 flex flex-col items-center">
                              <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-black animate-pulse flex items-center justify-center text-white text-[10px] font-bold shadow-lg">5</div>
                              <span className="text-[10px] font-bold mt-1 bg-white px-1 border border-black">الحديدة</span>
                          </div>
                          
                          <div className="absolute top-1/2 right-1/4 flex flex-col items-center">
                              <div className="w-8 h-8 bg-yellow-500 rounded-full border-2 border-black flex items-center justify-center text-black text-xs font-bold shadow-lg">12</div>
                              <span className="text-[10px] font-bold mt-1 bg-white px-1 border border-black">حضرموت</span>
                          </div>

                          <div className="absolute bottom-1/3 left-1/3 flex flex-col items-center">
                              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-black flex items-center justify-center text-white text-[10px] font-bold shadow-lg">2</div>
                              <span className="text-[10px] font-bold mt-1 bg-white px-1 border border-black">تعز</span>
                          </div>
                          
                          <div className="absolute top-1/3 left-1/2 flex flex-col items-center">
                              <div className="w-5 h-5 bg-orange-500 rounded-full border-2 border-black flex items-center justify-center text-white text-[10px] font-bold shadow-lg">8</div>
                              <span className="text-[10px] font-bold mt-1 bg-white px-1 border border-black">صنعاء</span>
                          </div>
                      </div>
                      
                      <div className="mt-4 space-y-2">
                          <h4 className="font-bold text-sm">المناطق الساخنة حالياً:</h4>
                          <div className="flex gap-2 text-xs font-bold">
                              <span className="bg-red-100 text-red-800 px-2 py-1 border border-red-200">الحديدة (اشتباه حمى قلاعية)</span>
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 border border-yellow-200">حضرموت (نقص تغذية)</span>
                          </div>
                      </div>
                  </div>
              </motion.div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
               <div className="geo-card p-6 shadow-[8px_8px_0_0_var(--geo-border)]">
                  <div className="flex items-center gap-4 mb-6 relative">
                    <div className="w-16 h-16 bg-[var(--geo-green)] border-2 border-[var(--geo-border)] rounded-lg shadow-[4px_4px_0_0_var(--geo-border)] flex items-center justify-center text-3xl">
                        {profile?.role === 'vet' ? '👨‍⚕️' : '👨‍🌾'}
                    </div>
                    <div>
                        <h2 className="text-xl font-black">{profile?.name}</h2>
                        <p className="text-gray-500 font-bold">{profile?.role === 'farmer' ? 'مربي حلال' : 'طبيب بيطري مختص'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 border-2 border-black bg-gray-50 text-sm font-bold">
                        <span className="text-gray-500">رقم الهاتف</span>
                        <span>{profile?.phone}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 border-2 border-black bg-gray-50 text-sm font-bold">
                        <span className="text-gray-500">الموقع</span>
                        <span>وادي حضرموت - تريم</span>
                    </div>
                    
                    <div className="pt-4 border-t-2 border-dashed border-gray-300">
                        <p className="text-xs text-gray-500 font-bold mb-2">إعدادات تجريبية:</p>
                        <button 
                            onClick={toggleRole}
                            className="w-full geo-button-primary bg-indigo-100 text-indigo-800 p-3 font-bold flex justify-center items-center gap-2"
                        >
                            تبديل حسابي إلى: {profile?.role === 'farmer' ? 'دكتور بيطري' : 'مربي حلال'}
                        </button>
                    </div>
                  </div>
               </div>
               
               <button 
                 onClick={() => auth.signOut()}
                 className="geo-card w-full p-4 text-red-600 font-black hover:bg-red-50 bg-white shadow-[4px_4px_0_0_var(--geo-border)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
               >
                 تسجيل الخروج من الحساب
               </button>
            </div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}


