import React from 'react';
import { useNetworkContracts } from '@/hooks/useNetworkContracts';

export function NetworkDisplay() {
  const { chainName, isPushNetwork } = useNetworkContracts();

  return (
    <div className="flex items-center justify-center py-1 px-3 rounded-full text-sm font-medium mr-2 mb-2 bg-opacity-90 shadow-sm" 
         style={{ 
           backgroundColor: isPushNetwork ? '#7B3FE4' : '#002D74',
           color: 'white'
         }}>
      Connected to {chainName} Network
    </div>
  );
}
