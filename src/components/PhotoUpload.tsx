import React, { useState } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';

interface PhotoUploadProps {
  onPhotoSelected: (file: File) => void;
}

export function PhotoUpload({ onPhotoSelected }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoSelected(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full">
      {!preview ? (
        <label className="geo-card cursor-pointer group flex flex-col items-center justify-center w-full h-40 bg-white hover:bg-gray-50 flex flex-col items-center justify-center pt-5 pb-6">
          <div className="icon-circle bg-white text-[var(--geo-green)] mb-3 group-hover:bg-gray-100 transition-colors">
            <Camera className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-black">أرفق صورة للحيوان</p>
          <p className="text-xs font-bold text-gray-500 mt-1">تساعد الصورة الطبيب في التشخيص</p>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        </label>
      ) : (
        <div className="geo-card relative overflow-hidden h-48">
          <img src={preview} alt="Animal Preview" className="w-full h-full object-cover" />
          <button
            onClick={(e) => {
              e.preventDefault();
              setPreview(null);
            }}
            className="absolute top-2 right-2 p-2 bg-white text-red-600 rounded-full border-2 border-[var(--geo-border)] hover:bg-gray-100 transition-colors"
          >
            <X size={18} strokeWidth={3} />
          </button>
        </div>
      )}
    </div>
  );
}
