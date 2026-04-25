import React from 'react';
import { motion } from 'motion/react';
import { Home, ClipboardList, BookOpen, User, Map as MapIcon } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'cases', label: 'حالاتي', icon: ClipboardList },
    { id: 'records', label: 'السجل', icon: BookOpen },
    { id: 'map', label: 'الخريطة', icon: MapIcon },
    { id: 'profile', label: 'حسابي', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-[var(--geo-border)] px-6 py-2 pb-6 safe-area-bottom z-50">
      <div className="max-w-md mx-auto flex justify-between items-center mt-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-1 group relative"
            >
              <div className={`p-2 transition-all ${isActive ? 'text-[var(--geo-green)]' : 'text-gray-400 group-hover:text-black'}`}>
                <Icon size={24} strokeWidth={isActive ? 3 : 2} />
              </div>
              <span className={`text-[10px] font-bold ${isActive ? 'text-[var(--geo-green)]' : 'text-gray-400'}`}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="w-8 h-1 bg-[var(--geo-green)] absolute -top-4 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
