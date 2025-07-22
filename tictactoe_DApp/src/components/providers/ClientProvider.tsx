'use client';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PushWalletProviderWrapper from "./PushWalletProvider";

const queryClient = new QueryClient();

export function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <PushWalletProviderWrapper>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </PushWalletProviderWrapper>
  );
}