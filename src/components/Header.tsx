'use client';

import { Shield, Server, Settings, Wifi, WifiOff } from 'lucide-react';
import { useAppStore } from '@/store';

export function Header() {
  const { ollamaConnected, ollamaModel } = useAppStore();
  
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-[#2e2e3a] z-50">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-[#f8fafc] font-semibold text-lg">Contract Sentinel</h1>
            <p className="text-[#94a3b8] text-xs">AI-Powered Risk Analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#12121a] border border-[#2e2e3a]">
            {ollamaConnected ? (
              <>
                <Wifi className="w-4 h-4 text-[#22c55e]" />
                <span className="text-[#94a3b8] text-xs">{ollamaModel || 'Connected'}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-[#ef4444]" />
                <span className="text-[#94a3b8] text-xs">Ollama Offline</span>
              </>
            )}
            <Server className="w-4 h-4 text-[#94a3b8] ml-2" />
          </div>
          
          <button className="p-2 rounded-lg hover:bg-[#12121a] transition-colors">
            <Settings className="w-5 h-5 text-[#94a3b8]" />
          </button>
        </div>
      </div>
    </header>
  );
}
