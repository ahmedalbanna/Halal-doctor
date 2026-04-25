import React from 'react';
import { motion } from 'motion/react';
import { Home, ClipboardList, BookOpen, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'cases', label: 'حالاتي', icon: ClipboardList },
    { id: 'records', label: 'السجل', icon: BookOpen },
    { id: 'profile', label: 'حسابي', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 pb-6 safe-area-bottom z-50">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-green-100 text-green-700' : 'text-gray-400 group-hover:text-green-600'}`}>
                <Icon size={24} />
              </div>
              <span className={`text-[10px] font-bold ${isActive ? 'text-green-700' : 'text-gray-400'}`}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="w-1 h-1 bg-green-700 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
