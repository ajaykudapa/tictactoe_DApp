// Hook for interacting with Push Chain

import { usePushWalletContext, usePushChainClient } from '@pushchain/ui-kit';
import { createPublicClient, http, SendTransactionParameters, Hash, defineChain } from 'viem';
import { useCallback, useMemo } from 'react';

// Define Push Chain testnet configuration compatible with current viem version
export const pushTestnetDonut = defineChain({
  id: 42101,
  name: 'Push Chain Donut Testnet',
  network: 'push-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'PC',
    symbol: 'PC',
  },
  rpcUrls: {
    default: {
      http: ['https://evm.rpc-testnet-donut-node1.push.org/', 'https://evm.rpc-testnet-donut-node2.push.org/'],
    },
  },
  blockExplorers: {
    default: { 
      name: 'Push Network Explorer', 
      url: 'https://donut.push.network' 
    },
  },
});

export function usePushChain() {
  const { universalAccount, connectionStatus } = usePushWalletContext();
  const { pushChainClient } = usePushChainClient();
  
  // Create Viem public client for reading contract data - MEMOIZED to prevent re-creation
  const publicClient = useMemo(() => createPublicClient({
    chain: pushTestnetDonut,
    transport: http('https://evm.rpc-testnet-donut-node1.push.org/'),
  }), []);

  // Create wallet client if connected (simplified for compatibility) - MEMOIZED
  const walletClient = useMemo(() => universalAccount ? {
    account: universalAccount.address as `0x${string}`,
    chain: pushTestnetDonut,
  } : null, [universalAccount]);

  // Send transaction helper using Push Chain's universal API
  const sendTransaction = useCallback(async (tx: SendTransactionParameters): Promise<Hash> => {
    if (!pushChainClient) throw new Error('Push Chain client not connected');
    
    try {
      // Use Push Chain's universal transaction sending
      const result = await pushChainClient.universal.sendTransaction({
        to: tx.to || '0x',
        value: tx.value || 0n,
        data: tx.data || '0x',
      });
      // Extract hash from Push Chain response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (result as any).txHash || (result as any).hash || '0x' as Hash;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }, [pushChainClient]);

  // Get explorer URL for transaction using Push Chain's built-in explorer utility
  const getExplorerUrl = (txHash: string): string => {
    return pushChainClient?.explorer.getTransactionUrl(txHash) || `https://donut.push.network/tx/${txHash}`;
  };

  return {
    pushChainClient,
    publicClient,
    walletClient,
    universalAccount,
    connectionStatus,
    sendTransaction,
    getExplorerUrl,
  };
}