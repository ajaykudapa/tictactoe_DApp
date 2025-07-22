import { useState, useEffect, useMemo, useCallback } from "react";
import { usePushChain } from "./usePushChain";
import { CONTRACTS, RESOLVER_ABI, CONTROLLER_ABI, REGISTRAR_ABI, REGISTRY_ABI } from "@/config/contracts";
import { NAME_REGISTRY_ABI } from "../abi/NameRegistry";
import { getContract, encodeFunctionData, namehash, keccak256, toHex, isAddress } from "viem";

export interface NameRecord {
  name: string;
  owner: string;
  expires: number;
  description?: string;
}

export interface TransactionStatus {
  loading: boolean;
  error?: string;
  success?: boolean;
  hash?: string;
}

export const COIN_TYPES = {
  BTC: 0,
  ETH: 60,
  SOLANA: 501,
  POLYGON: 966,
  ARBITRUM: 60,
  OPTIMISM: 60,
};

export const CHAIN_NAMES = {
  [COIN_TYPES.BTC]: "Bitcoin",
  [COIN_TYPES.ETH]: "Ethereum", 
  [COIN_TYPES.SOLANA]: "Solana",
  [COIN_TYPES.POLYGON]: "Polygon",
  [COIN_TYPES.ARBITRUM]: "Arbitrum",
  [COIN_TYPES.OPTIMISM]: "Optimism",
};

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

/**
 * Encode address for different coin types into bytes format for resolver
 * @param coinType - The coin type number
 * @param address - The address string
 * @returns The encoded address as bytes
 */
function encodeAddressForCoinType(coinType: number, address: string): `0x${string}` {
  try {
    switch (coinType) {
      case COIN_TYPES.ETH:
      case COIN_TYPES.POLYGON:
      case COIN_TYPES.ARBITRUM:
      case COIN_TYPES.OPTIMISM:
        // Ethereum-like addresses - return as hex string directly (already 20 bytes)
        if (!isAddress(address)) {
          throw new Error("Invalid Ethereum address format");
        }
        return address as `0x${string}`;
      
      case COIN_TYPES.BTC:
      case COIN_TYPES.SOLANA:
      default:
        // Other addresses - encode as UTF-8 bytes to hex string
        const encoder = new TextEncoder();
        const encodedBytes = encoder.encode(address);
        return ('0x' + Array.from(encodedBytes).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
    }
  } catch (error) {
    console.error(`Error encoding address for coin type ${coinType}:`, error);
    throw error;
  }
}

/**
 * Decode address bytes back to string format for different coin types
 * @param coinType - The coin type number
 * @param addressBytes - The address bytes from resolver
 * @returns The decoded address string
 */
function decodeAddressFromBytes(coinType: number, addressBytes: string): string {
  if (!addressBytes || addressBytes === "0x" || addressBytes === "0x0000000000000000000000000000000000000000") {
    return "";
  }

  try {
    switch (coinType) {
      case COIN_TYPES.ETH:
      case COIN_TYPES.POLYGON:
      case COIN_TYPES.ARBITRUM:
      case COIN_TYPES.OPTIMISM:
        // Ethereum-like addresses - they should be returned as hex addresses directly
        if (isAddress(addressBytes)) {
          return addressBytes;
        }
        // If it's longer than 42 chars, it might be padded bytes, extract the address
        if (addressBytes.length > 42) {
          const potentialAddress = '0x' + addressBytes.slice(-40);
          if (isAddress(potentialAddress)) {
            return potentialAddress;
          }
        }
        // If it's exactly 66 chars (0x + 64 hex = 32 bytes), take last 20 bytes for address
        if (addressBytes.length === 66) {
          const potentialAddress = '0x' + addressBytes.slice(-40);
          if (isAddress(potentialAddress)) {
            return potentialAddress;
          }
        }
        return addressBytes;
      
      case COIN_TYPES.BTC:
      case COIN_TYPES.SOLANA:
      default:
        // Decode bytes back to string using TextDecoder
        try {
          const hexString = addressBytes.slice(2); // Remove 0x prefix
          const bytes = new Uint8Array(hexString.length / 2);
          
          for (let i = 0; i < hexString.length; i += 2) {
            bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
          }
          
          // Remove null bytes and decode
          const nonNullBytes = bytes.filter(byte => byte !== 0);
          const decoder = new TextDecoder('utf-8');
          const result = decoder.decode(nonNullBytes);
          
          return result || addressBytes;
        } catch {
          // Fallback to simple char conversion
          try {
            const bytes = addressBytes.slice(2);
            let result = '';
            for (let i = 0; i < bytes.length; i += 2) {
              const byte = parseInt(bytes.substr(i, 2), 16);
              if (byte === 0) break;
              result += String.fromCharCode(byte);
            }
            return result || addressBytes;
          } catch {
            return addressBytes;
          }
        }
    }
  } catch (error) {
    console.error(`Error decoding address for coin type ${coinType}:`, error);
    return addressBytes;
  }
}

/**
 * Validate address format for different coin types
 * @param coinType - The coin type number
 * @param address - The address string to validate
 * @throws Error if address format is invalid
 */
export function validateAddressForCoinType(coinType: number, address: string): void {
  if (!address) {
    throw new Error("Address cannot be empty");
  }

  switch (coinType) {
    case COIN_TYPES.ETH:
    case COIN_TYPES.POLYGON:
    case COIN_TYPES.ARBITRUM:
    case COIN_TYPES.OPTIMISM:
      if (!isAddress(address)) {
        throw new Error("Invalid Ethereum address format");
      }
      break;
    
    case COIN_TYPES.BTC:
      // Bitcoin address validation (basic format check)
      if (!address.match(/^(1|3|bc1)[a-zA-Z0-9]{25,62}$/)) {
        throw new Error("Invalid Bitcoin address format");
      }
      break;
    
    case COIN_TYPES.SOLANA:
      // Solana address validation (base58, 32-44 characters)
      if (!address.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
        throw new Error("Invalid Solana address format");
      }
      break;
    
    default:
      // Basic validation for other addresses
      if (address.length < 8 || address.length > 100) {
        throw new Error("Invalid address format");
      }
      break;
  }
}

export function usePushChainNameManagement(name: string) {
  const { publicClient, universalAccount, pushChainClient, connectionStatus } = usePushChain();
  
  // State
  const [expires, setExpires] = useState<number>(0);
  const [owner, setOwner] = useState<string>("");
  const [ownedNames, setOwnedNames] = useState<NameRecord[]>([]);
  const [resolverAddress, setResolverAddress] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [renewalPrice, setRenewalPrice] = useState<bigint>(0n);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({ loading: false });
  const [loading, setLoading] = useState<boolean>(false);
  const [multiChainAddresses, setMultiChainAddresses] = useState<Record<number, string>>({});
  const [addressesLoading, setAddressesLoading] = useState<boolean>(false);

  // Contract instances - memoized to prevent re-creation
  const contracts = useMemo(() => {
    if (!publicClient) return null;
    
    return {
      controller: getContract({
        address: CONTRACTS.CONTROLLER as `0x${string}`,
        abi: CONTROLLER_ABI,
        client: publicClient,
      }),
      resolver: getContract({
        address: CONTRACTS.RESOLVER as `0x${string}`,
        abi: RESOLVER_ABI,
        client: publicClient,
      }),
      registrar: getContract({
        address: CONTRACTS.REGISTRAR as `0x${string}`,
        abi: REGISTRAR_ABI,
        client: publicClient,
      }),
      registry: getContract({
        address: CONTRACTS.REGISTRY as `0x${string}`,
        abi: REGISTRY_ABI,
        client: publicClient,
      }),
      nameRegistry: getContract({
        address: CONTRACTS.NAME_REGISTRY as `0x${string}`,
        abi: NAME_REGISTRY_ABI,
        client: publicClient,
      })
    };
  }, [publicClient]);

  // Fetch name data for a specific name
  const fetchNameData = useCallback(async (nameToFetch: string) => {
    if (!contracts) return;

    try {
      // Convert name to token ID (hash)
      const tokenId = keccak256(toHex(nameToFetch));
      
      // Get owner and expires from registrar (ERC721)
      const [ownerResult, expiresResult] = await Promise.all([
        contracts.registrar.read.ownerOf([BigInt(tokenId)]),
        contracts.registrar.read.nameExpires([BigInt(tokenId)])
      ]);
      
      setOwner(ownerResult as string);
      setExpires(Number(expiresResult));

      // Get resolver address from registry using namehash
      const nameNode = namehash(`${nameToFetch}.push`);
      const resolverResult = await contracts.registry.read.resolver([nameNode]);
      setResolverAddress(resolverResult as string);

      // Get description if resolver is set
      if (resolverResult && resolverResult !== "0x0000000000000000000000000000000000000000") {
        try {
          const descResult = await contracts.resolver.read.text([nameNode, "description"]);
          setDescription(descResult as string);
        } catch {
          setDescription("");
        }
      } else {
        setDescription("");
      }

      // Get renewal price
      const priceResult = await contracts.controller.read.rentPrice([nameToFetch, BigInt(365 * 24 * 60 * 60)]);
      setRenewalPrice(priceResult as bigint);

    } catch (error) {
      console.error("Error fetching name data:", error);
    }
  }, [contracts]);

  // BREAK CIRCULAR DEPENDENCY: Only run when name or contracts change, not when callback changes
  useEffect(() => {
    if (name && contracts) {
      fetchNameData(name);
    } else {
      // Clear data when no name selected
      setOwner("");
      setExpires(0);
      setResolverAddress("");
      setDescription("");
      setRenewalPrice(0n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, contracts]); // Remove fetchNameData from deps to break circular dependency

  // Fetch owned names using ERC721Enumerable pattern - STABILIZED DEPENDENCIES
  const fetchOwnedNames = useCallback(async () => {
    if (!universalAccount?.address || !contracts) {
      setOwnedNames([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get balance of owned tokens
      const balance = await contracts.registrar.read.balanceOf([universalAccount.address as `0x${string}`]);
      const balanceNum = Number(balance);
      
      const ownedNamesList: NameRecord[] = [];
      
      // Limit to reasonable number to prevent RPC overload
      const maxNames = Math.min(balanceNum, 5); // Reduced from 10 to 5
      
      // Fetch each owned token
      for (let i = 0; i < maxNames; i++) {
        try {
          // Get token ID by index
          const tokenId = await contracts.registrar.read.tokenOfOwnerByIndex([universalAccount.address as `0x${string}`, BigInt(i)]);
          
          // Get name from token ID using NameRegistry  
          const nameResult = await contracts.nameRegistry.read.getNameByTokenId([tokenId]);
          const nameStr = nameResult as string;
          
          if (nameStr) {
            // Get expiration
            const expiresResult = await contracts.registrar.read.nameExpires([tokenId]);
            
            // Skip description for now to reduce RPC calls
            ownedNamesList.push({
              name: nameStr,
              owner: universalAccount.address,
              expires: Number(expiresResult),
              description: ""
            });
          }
        } catch (error) {
          console.error(`Error fetching token at index ${i}:`, error);
        }
      }
      
      setOwnedNames(ownedNamesList);
    } catch (error) {
      console.error("Error fetching owned names:", error);
      setOwnedNames([]);
    } finally {
      setLoading(false);
    }
  }, [universalAccount?.address, contracts]);

  // BREAK CIRCULAR DEPENDENCY: Only run once when address or contracts change, not when callback changes
  useEffect(() => {
    if (universalAccount?.address && contracts) {
      fetchOwnedNames();
    } else {
      setOwnedNames([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universalAccount?.address, contracts]); // Remove fetchOwnedNames from deps to break circular dependency

  // Fetch multi-chain addresses for selected name (lazy loading)
  const fetchMultiChainAddresses = useCallback(async (nameToFetch: string) => {
    if (!contracts || !resolverAddress || resolverAddress === "0x0000000000000000000000000000000000000000") {
      setMultiChainAddresses({});
      return;
    }

    setAddressesLoading(true);
    try {
      const nameNode = namehash(`${nameToFetch}.push`);
      const addresses: Record<number, string> = {};
      
      // Fetch addresses for all supported coin types
      for (const coinType of Object.values(COIN_TYPES)) {
        try {
          // Use the multi-coin addr function first
          const addressResult = await contracts.resolver.read.addr([nameNode, BigInt(coinType)]);
          
          if (addressResult && addressResult !== "0x") {
            const decodedAddress = decodeAddressFromBytes(coinType, addressResult as string);
            if (decodedAddress && decodedAddress !== "0x0000000000000000000000000000000000000000") {
              addresses[coinType] = decodedAddress;
            }
          }
        } catch {
          if (coinType === COIN_TYPES.ETH) {
            try {
              const ethAddressResult = await contracts.resolver.read.addr([nameNode]);
              if (ethAddressResult && ethAddressResult !== "0x0000000000000000000000000000000000000000") {
                addresses[coinType] = ethAddressResult as string;
              }
            } catch {
              // No ETH address set
            }
          }
        }
      }
      
      setMultiChainAddresses(addresses);
    } catch (error) {
      console.error("Error fetching multi-chain addresses:", error);
    } finally {
      setAddressesLoading(false);
    }
  }, [contracts, resolverAddress]);

  // BREAK CIRCULAR DEPENDENCY: Only fetch addresses when name and resolver change, not when callback changes
  useEffect(() => {
    if (name && resolverAddress && resolverAddress !== "0x0000000000000000000000000000000000000000" && contracts) {
      fetchMultiChainAddresses(name);
    } else {
      setMultiChainAddresses({});
      setAddressesLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, resolverAddress, contracts]); // Remove fetchMultiChainAddresses from deps to break circular dependency

  // Renew name function
  const renewName = async (nameToRenew: string, duration: number = 365 * 24 * 60 * 60) => {
    if (!pushChainClient || !universalAccount || connectionStatus !== 'connected') {
      throw new Error("Push Chain client not connected");
    }

    setTransactionStatus({ loading: true });

    try {
      if (!contracts) throw new Error("Contracts not initialized");
      
      const price = await contracts.controller.read.rentPrice([nameToRenew, BigInt(duration)]);
      
      // Use Push Chain's universal transaction API
      const result = await pushChainClient.universal.sendTransaction({
        to: CONTRACTS.CONTROLLER as `0x${string}`,
        value: price as bigint,
        data: encodeFunctionData({
          abi: CONTROLLER_ABI,
          functionName: 'renew',
          args: [nameToRenew, BigInt(duration)]
        }),
      });

      const txHash = extractTransactionHash(result);
      setTransactionStatus({ loading: false, success: true, hash: txHash });
      
      return txHash;
    } catch (error) {
      console.error("Renewal failed:", error);
      setTransactionStatus({ 
        loading: false, 
        error: error instanceof Error ? error.message : "Renewal failed" 
      });
      throw error;
    }
  };

  // Update records function
  const updateRecords = async (nameToUpdate: string, records: Record<string, string>) => {
    if (!pushChainClient || !universalAccount || connectionStatus !== 'connected') {
      throw new Error("Push Chain client not connected");
    }

    setTransactionStatus({ loading: true });

    try {
      const nameNode = namehash(`${nameToUpdate}.push`);
      
      // Update description if provided
      if (records.description !== undefined) {
        const result = await pushChainClient.universal.sendTransaction({
          to: CONTRACTS.RESOLVER as `0x${string}`,
          value: 0n,
          data: encodeFunctionData({
            abi: RESOLVER_ABI,
            functionName: 'setText',
            args: [nameNode, "description", records.description]
          }),
        });

        const txHash = extractTransactionHash(result);
        setTransactionStatus({ loading: false, success: true, hash: txHash });
        
        // Update local state
        setDescription(records.description);
        
        return txHash;
      }
    } catch (error) {
      console.error("Update failed:", error);
      setTransactionStatus({ 
        loading: false, 
        error: error instanceof Error ? error.message : "Update failed" 
      });
      throw error;
    }
  };

  // Set multi-chain address
  const setMultiChainAddress = async (coinType: number, address: string) => {
    if (!pushChainClient || !universalAccount || connectionStatus !== 'connected') {
      throw new Error("Push Chain client not connected");
    }

    if (!name) {
      throw new Error("No name selected");
    }

    setTransactionStatus({ loading: true });

    try {
      const nameNode = namehash(`${name}.push`);
      
      // Validate address format for the specific coin type
      validateAddressForCoinType(coinType, address);
      
      // Encode address for the specific coin type
      const encodedAddress = encodeAddressForCoinType(coinType, address);
      
      // Use the multi-coin setAddr function
      const result = await pushChainClient.universal.sendTransaction({
        to: CONTRACTS.RESOLVER as `0x${string}`,
        value: 0n,
        data: encodeFunctionData({
          abi: RESOLVER_ABI,
          functionName: 'setAddr',
          args: [nameNode, BigInt(coinType), encodedAddress]
        }),
      });

      const txHash = extractTransactionHash(result);
      setTransactionStatus({ loading: false, success: true, hash: txHash });
      
      // Update local state
      setMultiChainAddresses(prev => ({
        ...prev,
        [coinType]: address
      }));
      
      return txHash;
    } catch (error) {
      console.error("Set address failed:", error);
      setTransactionStatus({ 
        loading: false, 
        error: error instanceof Error ? error.message : "Set address failed" 
      });
      throw error;
    }
  };

  // Refresh owned names
  const refreshNames = useCallback(async () => {
    await fetchOwnedNames();
  }, [fetchOwnedNames]);

  const isOwner = universalAccount?.address?.toLowerCase() === owner?.toLowerCase();

  return {
    expires,
    owner,
    renewName,
    updateRecords,
    ownedNames,
    resolverAddress,
    description,
    renewalPrice,
    loading,
    transactionStatus,
    setTransactionStatus,
    refreshNames,
    multiChainAddresses,
    addressesLoading,
    setMultiChainAddress,
    isOwner: isOwner,
    COIN_TYPES,
    CHAIN_NAMES,
  };
}