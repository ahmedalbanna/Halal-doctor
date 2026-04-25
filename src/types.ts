export type AnimalType = 'sheep' | 'cow' | 'camel' | 'bee' | 'other';

export interface User {
  uid: string;
  name: string;
  role: 'farmer' | 'vet';
  phone: string;
  location?: string;
  createdAt: number;
}

export interface Case {
  id: string;
  farmerId: string;
  vetId?: string;
  animalType: AnimalType;
  voiceUrl?: string;
  imageUrl?: string;
  symptoms: string[];
  status: 'pending' | 'assigned' | 'responded' | 'closed';
  vetVoiceResponseUrl?: string;
  prescription?: string;
  createdAt: number;
  updatedAt: number;
}

export const ANIMAL_TYPES = [
  { id: 'sheep', name: 'أغنام', icon: '🐑' },
  { id: 'cow', name: 'أبقار', icon: '🐄' },
  { id: 'camel', name: 'جمال', icon: '🐫' },
  { id: 'bee', name: 'نحل', icon: '🐝' },
  { id: 'other', name: 'آخر', icon: '🐾' },
] as const;

export const SYMPTOMS = [
  { id: 'not_eating', name: 'فقدان شهية', icon: '🍽️' },
  { id: 'fever', name: 'حرارة', icon: '🔥' },
  { id: 'diarrhea', name: 'إسهال', icon: '💧' },
  { id: 'cough', name: 'سعال', icon: '🗣️' },
  { id: 'swelling', name: 'انتفاخ', icon: '🎈' },
  { id: 'eye_issue', name: 'مشكلة بالعين', icon: '👁️' },
  { id: 'cant_walk', name: 'عرج/رقاد', icon: '🦵' },
  { id: 'bee_not_flying', name: 'نحل لا يطير', icon: '🚫' },
] as const;
