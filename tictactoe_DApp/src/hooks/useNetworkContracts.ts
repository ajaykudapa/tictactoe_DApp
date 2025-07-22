import { CONTRACTS } from '@/config/contracts';

export function useNetworkContracts() {
  // Always use PUSH network contracts (updated structure)
  const contracts = CONTRACTS;
  return {
    contracts,
    isPushNetwork: true,
    chainName: 'Push',
  };
}
