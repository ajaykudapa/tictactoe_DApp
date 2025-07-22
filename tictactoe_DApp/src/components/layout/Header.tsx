'use client';

import { PushUniversalAccountButton, usePushWalletContext } from '@pushchain/ui-kit';
import Link from 'next/link';

export default function Header() {
  const { connectionStatus, universalAccount } = usePushWalletContext();

  return (
    <header className="bg-white border-b border-push-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold bg-gradient-to-r from-push-primary to-push-secondary bg-clip-text text-transparent">
              Push
            </span>
          </Link>

          {/* Push Wallet Connection */}
          <div className="flex items-center space-x-4">
            {connectionStatus === 'connected' && universalAccount ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-push-text-secondary">
                  {universalAccount.address.slice(0, 6)}...{universalAccount.address.slice(-4)}
                </span>
                <PushUniversalAccountButton />
              </div>
            ) : (
              <PushUniversalAccountButton />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
