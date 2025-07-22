import { useState, useCallback, useEffect } from 'react';
import { usePushChain } from './usePushChain';
import { CONTROLLER_ABI, RESOLVER_ABI, CONTRACTS } from '@/config/contracts';
import { getContract, encodeFunctionData } from 'viem';
import { keccak256, toHex, namehash } from 'viem';

const COMMITMENT_AGE = 70;
const duration = 365 * 24 * 60 * 60;


/**
 * Extract transaction hash from Push Chain DeliverTxResponse
 * @param txResult - The result from pushChainClient.universal.sendTransaction
 * @returns The transaction hash as a string (explorer-compatible)
 */
function extractTransactionHash(txResult: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = txResult as any;
  
  // Push Chain returns two hash fields:
  // - hash: internal Push Chain hash
  // - transactionHash: EVM-compatible hash for explorer
  const hash = result?.transactionHash || result?.hash || result || '0x';
  
  return hash;
}

export interface RegistrationStep {
  step: 'initial' | 'committed' | 'registering' | 'complete';
  commitmentTimestamp?: number;
  transactionHash?: string;
}

export interface TransactionStatus {
  loading: boolean;
  error?: string;
  success?: boolean;
  hash?: string;
}

export function usePushChainNameRegistration(name: string) {
  const { 
    pushChainClient, 
    publicClient, 
    universalAccount,
    connectionStatus,
    getExplorerUrl
  } = usePushChain();
  

  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>({ 
    step: 'initial' 
  });

  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({ 
    loading: false 
  });

  const [remainingTime, setRemainingTime] = useState(COMMITMENT_AGE);

  const secretString = "test-secret-12345";
  const secretBytes = toHex(secretString);
  const secret = keccak256(secretBytes);

  const address = universalAccount?.address;

  // Create contract instances
  const controllerContract = getContract({
    address: CONTRACTS.CONTROLLER as `0x${string}`,
    abi: CONTROLLER_ABI,
    client: publicClient,
  });


  // Read contract data
  const [isValid, setIsValid] = useState<boolean | undefined>(undefined);
  const [isAvailable, setIsAvailable] = useState<boolean | undefined>(undefined);
  const [price, setPrice] = useState<bigint | null>(null);
  const [commitment, setCommitment] = useState<`0x${string}` | null>(null);

  useEffect(() => {
    async function fetchContractData() {
      if (!name || !publicClient) return;

      try {
        const [validResult, availableResult, priceResult] = await Promise.all([
          controllerContract.read.valid([name]),
          controllerContract.read.available([name]),
          controllerContract.read.rentPrice([name, BigInt(duration)]),
        ]);

        setIsValid(validResult as boolean);
        setIsAvailable(availableResult as boolean);
        setPrice(priceResult as bigint);

        // Generate commitment if address is available
        if (address) {
          const commitmentResult = await controllerContract.read.makeCommitment([
            name,
            address as `0x${string}`,
            BigInt(duration),
            secret,
            CONTRACTS.RESOLVER as `0x${string}`,
            [] 
          ]);
          setCommitment(commitmentResult as `0x${string}`);
        }
      } catch (error) {
        console.error('Error fetching contract data:', error);
      }
    }

    fetchContractData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, address, publicClient]);

  const commitName = useCallback(async () => {
    if (!name || !commitment || !pushChainClient || !address || connectionStatus !== 'connected') {
      console.error('Missing requirements for commit:', { name, commitment, pushChainClient, address, connectionStatus });
      return;
    }
    
    setTransactionStatus({ loading: true });
    try {
      // Encode the commit function call
      const data = encodeFunctionData({
        abi: CONTROLLER_ABI,
        functionName: 'commit',
        args: [commitment]
      });

      // Send transaction using Push Chain client
      const txResult = await pushChainClient.universal.sendTransaction({
        to: CONTRACTS.CONTROLLER as `0x${string}`,
        value: BigInt(0),
        data,
      });

      // Extract hash from Push Chain response
      const txHash = extractTransactionHash(txResult);

      console.log('Commit transaction submitted:', txHash);
      
      setTransactionStatus({ loading: false, success: true, hash: txHash });
      setRegistrationStep({
        step: 'committed',
        commitmentTimestamp: Math.floor(Date.now() / 1000),
        transactionHash: txHash
      });

      return txHash;
    } catch (err: Error | unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Commit error:', err);
      setTransactionStatus({ loading: false, error: errorMessage });
      throw err;
    }
  }, [name, commitment, pushChainClient, address, connectionStatus]);

  const registerName = useCallback(async () => {
    if (!name || !price || !pushChainClient || !address || connectionStatus !== 'connected') {
      console.error('Missing requirements for register:', { name, price, pushChainClient, address, connectionStatus });
      return;
    }
    
    setTransactionStatus({ loading: true });
    try {
      setRegistrationStep(prev => ({ ...prev, step: 'registering' }));
      
      // Encode the register function call
      const data = encodeFunctionData({
        abi: CONTROLLER_ABI,
        functionName: 'register',
        args: [name, address as `0x${string}`, BigInt(duration), secret, CONTRACTS.RESOLVER as `0x${string}`, []]
      });

      // Send transaction using Push Chain client
      const registerTxResult = await pushChainClient.universal.sendTransaction({
        to: CONTRACTS.CONTROLLER as `0x${string}`,
        value: price,
        data,
      });

      // Extract hash from Push Chain response
      const registerTx = extractTransactionHash(registerTxResult);

      console.log('Register transaction submitted:', registerTx);
      console.log('View on explorer:', getExplorerUrl(registerTx));
      
      // Set up the resolver manually since the controller might not be doing it
      const nameNode = namehash(`${name}.push`);
      
      try {
        console.log('Setting up resolver for registered name...');
        
        // Import the REGISTRY_ABI for this operation
        const { REGISTRY_ABI } = await import('@/config/contracts');
        
        // Set the resolver for this name in the registry (user is now the owner)
        const setResolverData = encodeFunctionData({
          abi: REGISTRY_ABI,
          functionName: 'setResolver',
          args: [nameNode as `0x${string}`, CONTRACTS.RESOLVER as `0x${string}`]
        });

        const resolverTxResult = await pushChainClient.universal.sendTransaction({
          to: CONTRACTS.REGISTRY as `0x${string}`,
          value: BigInt(0),
          data: setResolverData,
        });

        const resolverTx = extractTransactionHash(resolverTxResult);
        console.log('Resolver setup transaction:', resolverTx);
        
        // Set the user's address in the resolver
        const setAddrData = encodeFunctionData({
          abi: RESOLVER_ABI,
          functionName: 'setAddr',
          args: [nameNode as `0x${string}`, address as `0x${string}`]
        });

        const addrTxResult = await pushChainClient.universal.sendTransaction({
          to: CONTRACTS.RESOLVER as `0x${string}`,
          value: BigInt(0),
          data: setAddrData,
        });

        const addrTx = extractTransactionHash(addrTxResult);
        console.log('Address setup transaction:', addrTx);
        
      } catch (setupError) {
        console.warn('Post-registration setup failed:', setupError);
        // Don't fail the entire registration if setup fails
      }

      setTransactionStatus({ loading: false, success: true, hash: registerTx });
      setRegistrationStep({ step: 'complete' });
      
      return registerTx;
    } catch (err: Error | unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Register error:', err);
      setTransactionStatus({ loading: false, error: errorMessage });
      setRegistrationStep({ step: 'initial' });
      throw err;
    }
  }, [name, price, pushChainClient, address, connectionStatus, getExplorerUrl, secret]);

  
  useEffect(() => {
    if (registrationStep.step !== 'committed' || !registrationStep.commitmentTimestamp) {
      setRemainingTime(0);
      return;
    }

    const timer = setInterval(() => {
      const elapsed = Math.floor(Date.now() / 1000) - (registrationStep.commitmentTimestamp || 0);
      const remaining = Math.max(0, COMMITMENT_AGE - elapsed);
      setRemainingTime(remaining);

      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [registrationStep]);

  return {
    isAvailable,
    isValid,
    price,
    commitName,
    registerName,
    registrationStep,
    transactionStatus,
    remainingTime,
    isPushWalletConnected: connectionStatus === 'connected' && !!universalAccount,
    pushWalletAddress: universalAccount?.address,
    getExplorerUrl,
  };
}