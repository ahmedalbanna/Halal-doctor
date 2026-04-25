export type AnimalType = 'sheep' | 'cow' | 'camel' | 'bee' | 'other';

export interface User {
  uid: string;
  name: string;
  role: 'farmer' | 'vet';
  phone: string;
  location?: string;
  specialization?: string;
  createdAt: number;
}

export interface Vaccination {
  id?: string;
  name: string;
  administeredAt: number;
  nextDueDate: number;
}

export interface Animal {
  id?: string;
  ownerId: string;
  name: string;
  type: string;
  healthHistory: string[];
  vaccinations?: Vaccination[];
  createdAt: number;
}

export interface Case {
  id: string;
  farmerId: string;
  vetId?: string;
  animalType: AnimalType;
  voiceUrl?: string; // Legacy
  voiceUrls?: string[];
  imageUrl?: string;
  symptoms: string[];
  customSymptoms?: string;
  status: 'pending' | 'assigned' | 'responded' | 'closed';
  vetVoiceResponseUrl?: string;
  prescription?: string;
  differentialDiagnosis?: string;
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

export const SYMPTOMS_GROUPS = [
  {
      category: 'عامة',
      symptoms: [
          { id: 'not_eating', name: 'فقدان شهية', icon: '🍽️' },
          { id: 'fever', name: 'حرارة', icon: '🔥' },
          { id: 'weakness', name: 'خمول/ضعف', icon: '🔋' }
      ]
  },
  {
      category: 'تنفسية وهضمية',
      symptoms: [
          { id: 'diarrhea', name: 'إسهال', icon: '💧' },
          { id: 'cough', name: 'سعال', icon: '🗣️' },
          { id: 'swelling', name: 'انتفاخ بطن', icon: '🎈' },
      ]
  },
  {
      category: 'حركية وظاهرية',
      symptoms: [
          { id: 'eye_issue', name: 'مشكلة بالعين', icon: '👁️' },
          { id: 'cant_walk', name: 'عرج/رقاد', icon: '🦵' },
          { id: 'skin_lesions', name: 'جروح/قرح', icon: '🩹' },
      ]
  },
  {
      category: 'نحل',
      symptoms: [
          { id: 'bee_not_flying', name: 'نحل لا يطير', icon: '🚫' },
          { id: 'varroa', name: 'تساقط أجنحة', icon: '🐝' },
      ]
  }
];

// Flat export for existing references if any, mainly we switch to groups
export const SYMPTOMS = SYMPTOMS_GROUPS.flatMap(g => g.symptoms);
