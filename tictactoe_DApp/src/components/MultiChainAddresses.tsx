import React, { useState } from 'react';
import { CHAIN_NAMES, COIN_TYPES, validateAddressForCoinType } from '@/hooks/usePushChainNameManagement';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Copy, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MultiChainAddressesProps {
  addresses: Record<number, string>;
  loading: boolean;
  isOwner: boolean;
  onSetAddress: (coinType: number, address: string) => Promise<void>;
  transactionStatus: {
    loading: boolean;
    success?: boolean;
    error?: string;
    hash?: string;
  };
}

const MultiChainAddresses: React.FC<MultiChainAddressesProps> = ({
  addresses,
  loading,
  isOwner,
  onSetAddress,
  transactionStatus,
}) => {
  const [newAddresses, setNewAddresses] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<string>("eth");
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // List of supported chains in preferred order
  const supportedChains = [
    { id: COIN_TYPES.ETH, name: "ETH", label: "Ethereum", key: "eth" },
    { id: COIN_TYPES.BTC, name: "BTC", label: "Bitcoin", key: "btc" },
    { id: COIN_TYPES.SOLANA, name: "SOL", label: "Solana", key: "sol" },
    { id: COIN_TYPES.POLYGON, name: "MATIC", label: "Polygon", key: "polygon" },
    { id: COIN_TYPES.ARBITRUM, name: "ARB", label: "Arbitrum", key: "arbitrum" },
    { id: COIN_TYPES.OPTIMISM, name: "OP", label: "Optimism", key: "optimism" },
  ];

  const handleAddressChange = (coinType: number, value: string) => {
    setNewAddresses(prev => ({
      ...prev,
      [coinType]: value
    }));
  };

  const handleSetAddress = async (coinType: number) => {
    const address = newAddresses[coinType];
    if (!address) return;

    try {
      await onSetAddress(coinType, address);
      // Clear the input after successful update
      setNewAddresses(prev => ({
        ...prev,
        [coinType]: ''
      }));
    } catch (error) {
      console.error("Error setting address:", error);
    }
  };

  const isValidAddress = (coinType: number, address: string): boolean => {
    if (!address) return false;
    
    try {
      validateAddressForCoinType(coinType, address);
      return true;
    } catch {
      return false;
    }
  };

  const copyToClipboard = (text: string, chainId: number) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(`${CHAIN_NAMES[chainId]}`);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // Format address for display based on chain type
  const formatAddress = (chainId: number, address: string): string => {
    if (!address) return '';
    
    // For ETH-like addresses, show shortened version
    if (chainId === COIN_TYPES.ETH || 
        chainId === COIN_TYPES.POLYGON || 
        chainId === COIN_TYPES.ARBITRUM || 
        chainId === COIN_TYPES.OPTIMISM) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    
    // For BTC, just show as is if it's short enough, otherwise shorten
    if (chainId === COIN_TYPES.BTC && address.length > 16) {
      return `${address.slice(0, 8)}...${address.slice(-8)}`;
    }
    
    // For Solana, shorten long addresses
    if (chainId === COIN_TYPES.SOLANA && address.length > 16) {
      return `${address.slice(0, 8)}...${address.slice(-8)}`;
    }
    
    return address;
  };

  return (
    <Card className="bg-white shadow-lg border-push-border overflow-hidden mt-6">
      <CardHeader className="border-b border-push-border/30 bg-gradient-to-r from-push-primary/5 to-push-secondary/5">
        <CardTitle className="text-xl text-push-primary font-bold">
          Multi-Chain Addresses
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6">
        <Tabs defaultValue="eth" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex mb-6 overflow-x-auto w-full max-w-full space-x-1 bg-gray-100 p-1 rounded-lg">
            {supportedChains.map(chain => (
              <TabsTrigger 
                key={chain.key} 
                value={chain.key}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === chain.key ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
              >
                {chain.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {supportedChains.map(chain => (
            <TabsContent key={chain.key} value={chain.key} className="mt-0">
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Current {chain.label} Address</h3>
                  
                  {loading ? (
                    <div className="flex items-center text-gray-400">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </div>
                  ) : addresses[chain.id] ? (
                    <div className="flex items-center">
                      <span className="font-mono text-sm text-push-text-primary bg-gray-100 py-1 px-2 rounded break-all">
                        {formatAddress(chain.id, addresses[chain.id])}
                      </span>
                      <button 
                        onClick={() => copyToClipboard(addresses[chain.id], chain.id)}
                        className="ml-2 p-1 hover:bg-gray-200 rounded"
                        type="button"
                      >
                        <Copy className="w-4 h-4 text-gray-500" />
                      </button>
                      {copySuccess === CHAIN_NAMES[chain.id] && (
                        <span className="ml-2 text-xs text-green-600">Copied!</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">No {chain.label} address set</p>
                  )}
                </div>
                
                {isOwner && (
                  <div className="pt-2 space-y-3">
                    <Label htmlFor={`${chain.name}-address`} className="text-push-text-primary">
                      Set {chain.label} Address
                    </Label>
                    <div className="flex space-x-2">
                      <Input
                        id={`${chain.name}-address`}
                        value={newAddresses[chain.id] || ''}
                        onChange={(e) => handleAddressChange(chain.id, e.target.value)}
                        placeholder={`Enter ${chain.label} address`}
                        className="border-push-border focus:border-push-primary flex-1"
                      />
                      <Button
                        onClick={() => handleSetAddress(chain.id)}
                        disabled={!isValidAddress(chain.id, newAddresses[chain.id] || '') || transactionStatus.loading}
                        className="bg-push-primary hover:bg-push-primary/90"
                      >
                        {transactionStatus.loading ? (
                          <div className="flex items-center">
                            <Loader2 className="animate-spin w-4 h-4 mr-2" />
                            Setting...
                          </div>
                        ) : (
                          'Set Address'
                        )}
                      </Button>
                    </div>
                    
                    {newAddresses[chain.id] && !isValidAddress(chain.id, newAddresses[chain.id]) && (
                      <p className="text-red-500 text-xs mt-1">Invalid {chain.label} address format</p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
        
        {transactionStatus.error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{transactionStatus.error}</AlertDescription>
          </Alert>
        )}

        {transactionStatus.success && (
          <Alert className="mt-4 bg-green-50 text-green-700 border border-green-200">
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>Address updated successfully!</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default MultiChainAddresses;
