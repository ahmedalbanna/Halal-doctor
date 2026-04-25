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
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-green-200 rounded-2xl bg-white hover:bg-green-50 transition-colors cursor-pointer group">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <div className="p-3 bg-green-100 rounded-full mb-3 group-hover:bg-green-200 transition-colors">
              <Camera className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-sm text-green-700 font-bold">صور الحيوان المريض</p>
            <p className="text-xs text-green-500 mt-1">تساعد الصورة الطبيب في التشخيص</p>
          </div>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        </label>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border-2 border-green-200">
          <img src={preview} alt="Animal Preview" className="w-full h-48 object-cover" />
          <button
            onClick={() => setPreview(null)}
            className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
