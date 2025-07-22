"use client";

import { ReactNode } from 'react';
import { 
  PushUniversalWalletProvider,
  PushUI,
} from '@pushchain/ui-kit';

interface PushWalletProviderWrapperProps {
  children: ReactNode;
}

export default function PushWalletProviderWrapper({ children }: PushWalletProviderWrapperProps) {
  // Define Wallet Config - exactly matching the example
  const walletConfig = {
    network: PushUI.CONSTANTS.PUSH_NETWORK.TESTNET_DONUT,
    login: {
      email: true,
      google: true,
      wallet: {
        enabled: true,
      },
      appPreview: true,
    },
    modal: {
      loginLayout: PushUI.CONSTANTS.LOGIN.SPLIT,
      connectedLayout: PushUI.CONSTANTS.CONNECTED.HOVER,
      appPreview: true,
    },
  };

  // Define Your App Preview - exactly matching the example
  const appMetadata = {
    logoUrl: 'https://plus.unsplash.com/premium_photo-1746731481770-08b2f71661d0?q=80&w=2671&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: "Push Naming Service",
    description: "Your identity on Push Network",
  };

  return (
    <PushUniversalWalletProvider config={walletConfig} app={appMetadata}>
      {children}
    </PushUniversalWalletProvider>
  );
}