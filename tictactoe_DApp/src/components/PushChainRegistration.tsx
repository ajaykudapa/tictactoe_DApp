'use client';

import { useState } from 'react';
import { usePushChainNameRegistration } from '@/hooks/usePushChainNameRegistration';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { formatEther } from 'viem';

interface PushChainRegistrationProps {
  name: string;
}

export default function PushChainRegistration({ name }: PushChainRegistrationProps) {
  const {
    isAvailable,
    isValid,
    price,
    commitName,
    registerName,
    registrationStep,
    transactionStatus,
    remainingTime,
    isPushWalletConnected,
    pushWalletAddress,
    getExplorerUrl,
  } = usePushChainNameRegistration(name);

  const [isProcessing, setIsProcessing] = useState(false);

  const formatPrice = (priceWei: bigint | null) => {
    if (!priceWei) return '0';
    return formatEther(priceWei);
  };

  const handleCommit = async () => {
    setIsProcessing(true);
    try {
      await commitName();
    } catch (error) {
      console.error('Commit failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegister = async () => {
    setIsProcessing(true);
    try {
      await registerName();
    } catch (error) {
      console.error('Register failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isPushWalletConnected) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Push Chain Registration</h3>
        <Alert>
          Please connect your Push Wallet to register names on Push Chain
        </Alert>
      </Card>
    );
  }

  if (!isValid || !isAvailable) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Push Chain Registration</h3>
        <Alert variant="destructive">
          {!isValid ? 'Invalid name format' : 'Name is not available'}
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Register on Push Chain</h3>
      
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Name: <span className="font-semibold">{name}.push</span></p>
          <p className="text-sm text-gray-600">Price: <span className="font-semibold">{formatPrice(price)} PC</span></p>
          <p className="text-sm text-gray-600">Duration: <span className="font-semibold">1 year</span></p>
          <p className="text-sm text-gray-600">Wallet: <span className="font-semibold">{pushWalletAddress?.slice(0, 6)}...{pushWalletAddress?.slice(-4)}</span></p>
        </div>

        {registrationStep.step === 'initial' && (
          <>
            <p className="text-sm text-gray-600">
              Registration is a two-step process to prevent front-running:
            </p>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
              <li>Commit to the name (creates a secret commitment)</li>
              <li>Wait 70 seconds</li>
              <li>Register the name</li>
            </ol>
            <Button 
              onClick={handleCommit}
              disabled={isProcessing || transactionStatus.loading}
              className="w-full"
            >
              {isProcessing ? 'Processing...' : 'Step 1: Commit Name'}
            </Button>
          </>
        )}

        {registrationStep.step === 'committed' && (
          <>
            <Alert>
              Commitment successful! Please wait {remainingTime} seconds before registering.
            </Alert>
            {registrationStep.transactionHash && (
              <p className="text-sm">
                <a 
                  href={getExplorerUrl(registrationStep.transactionHash)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-push-primary hover:underline"
                >
                  View commitment transaction →
                </a>
              </p>
            )}
            <Button 
              onClick={handleRegister}
              disabled={remainingTime > 0 || isProcessing || transactionStatus.loading}
              className="w-full"
            >
              {remainingTime > 0 
                ? `Wait ${remainingTime}s to register` 
                : isProcessing 
                ? 'Processing...' 
                : 'Step 2: Register Name'}
            </Button>
          </>
        )}

        {registrationStep.step === 'registering' && (
          <Alert>
            Registration in progress... This may take a moment.
          </Alert>
        )}

        {registrationStep.step === 'complete' && (
          <>
            <Alert className="bg-green-50 border-green-200">
              🎉 Registration complete! You now own {name}.push
            </Alert>
            {transactionStatus.hash && (
              <p className="text-sm">
                <a 
                  href={getExplorerUrl(transactionStatus.hash)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-push-primary hover:underline"
                >
                  View registration transaction →
                </a>
              </p>
            )}
          </>
        )}

        {transactionStatus.error && (
          <Alert variant="destructive">
            Error: {transactionStatus.error}
          </Alert>
        )}
      </div>
    </Card>
  );
}