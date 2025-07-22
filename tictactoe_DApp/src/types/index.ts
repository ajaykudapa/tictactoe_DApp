export interface NameRecord {
  name: string;
  tokenId: string; // Changed from bigint to string to match our implementation
  expires: number;
  description?: string;
}

export interface TransactionStatus {
  loading: boolean;
  error?: string;
  success?: boolean;
  hash?: string;
}
  export interface RegistrationStep {
    step: 'initial' | 'committed' | 'registering' | 'complete';
    commitmentTimestamp?: number;
    transactionHash?: string;
  }
  
  export interface ResolverRecord {
    key: string;
    value: string;
  }
  
  export type TransactionCallback = () => Promise<{ hash: string } | undefined>;