import { task } from "hardhat/config";

const PUSH_CHAIN_CONTRACT_ADDRESSES = {
  REGISTRY: "0x845BB6343D0348dD4F4fb7Bf0Da4bf672e2953BE",
  PRICE_ORACLE: "0x10e0b21f8B4a94aF2B7FC685797b82EF3068ceb9",
  REGISTRAR: "0xbE1ba6467c402B523596Cc3465D593a762da7993",
  RESOLVER: "0x1B612D44EAbFC4b737Bb7ecA6Bb4E39e526aaC54", 
  NAME_REGISTRY: "0x288dF71D79DCbC833b6e765Bc4FFE312ec290f7C",
  CONTROLLER: "0xbEBd193b7858EcD26a78D9501722449FEE2eCD55"
};

// Reduced commitment age for testing (in seconds)
const TEST_COMMITMENT_AGE = 70; // Use 70 seconds for testing instead of the normal ~70 seconds

task("test-push-contracts", "Tests the Push Chain naming service contracts")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    
    // Test results summary
    const testResults = {
      testName: "",
      tester: "",
      contracts: PUSH_CHAIN_CONTRACT_ADDRESSES,
      transactions: {
        commitment: "",
        registration: "",
        setAddress: ""
      },
      namehash: "",
      tokenId: "",
      registered: false,
      owner: "",
      resolvedAddress: "",
      price: "",
      timestamp: new Date().toISOString()
    };
    
    // Get the signer
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);
    testResults.tester = deployer.address;
    
    // Load the contract ABIs
    const RegistrarController = await ethers.getContractFactory("PushRegistrarController");
    const controller = RegistrarController.attach(PUSH_CHAIN_CONTRACT_ADDRESSES.CONTROLLER);
    
    const BaseRegistrar = await ethers.getContractFactory("BaseRegistrar");
    const registrar = BaseRegistrar.attach(PUSH_CHAIN_CONTRACT_ADDRESSES.REGISTRAR);
    
    const PublicResolver = await ethers.getContractFactory("PublicResolver");
    const resolver = PublicResolver.attach(PUSH_CHAIN_CONTRACT_ADDRESSES.RESOLVER);
    
    const Registry = await ethers.getContractFactory("PushRegistry");
    const registry = Registry.attach(PUSH_CHAIN_CONTRACT_ADDRESSES.REGISTRY);
    
    try {
      // Step 1: Check if name is valid and available
      console.log("\nStep 1: Checking if name is valid and available");
      
      // Generate a unique test name
      const testName = "test" + Math.floor(Math.random() * 10000);
      testResults.testName = testName;
      console.log(`Test name: ${testName}.push`);
      
      const isValid = await controller.valid(testName);
      console.log(`Is name valid? ${isValid}`);
      
      if (!isValid) {
        console.error("Test name is not valid. Please use a different name.");
        return;
      }
      
      const isAvailable = await controller.available(testName);
      console.log(`Is name available? ${isAvailable}`);
      
      if (!isAvailable) {
        console.error("Test name is not available. Please use a different name.");
        return;
      }
      
      // Step 2: Calculate price and make a commitment
      console.log("\nStep 2: Calculating price and making a commitment");
      
      // Calculate the price for a 1-year registration
      const duration = 365 * 24 * 60 * 60; // 1 year in seconds
      const price = await controller.rentPrice(testName, duration);
      console.log(`Registration price: ${ethers.formatUnits(price, 18)} PUSH`);
      testResults.price = ethers.formatUnits(price, 18);
      
      // Create a commitment
      const secret = ethers.keccak256(ethers.toUtf8Bytes("test-secret-" + Math.random()));
      const commitment = await controller.makeCommitment(
        testName,
        deployer.address,
        duration,
        secret,
        PUSH_CHAIN_CONTRACT_ADDRESSES.RESOLVER,
        []
      );
      
      // Submit the commitment
      console.log("Submitting commitment transaction...");
      const commitTx = await controller.commit(commitment);
      await commitTx.wait();
      console.log(`Commitment transaction: ${commitTx.hash}`);
      testResults.transactions.commitment = commitTx.hash;
      
      // Step 3: Wait for the commitment age to pass
      console.log(`\nStep 3: Waiting for ${TEST_COMMITMENT_AGE} seconds for the commitment age to pass...`);
      console.log(`Minimum commitment age configured for testing: ${TEST_COMMITMENT_AGE} seconds`);
      await new Promise(resolve => setTimeout(resolve, TEST_COMMITMENT_AGE * 1000));
      
      // Step 4: Register the name
      console.log("\nStep 4: Registering the name");
      
      try {
        const registerTx = await controller.register(
          testName,
          deployer.address,
          duration,
          secret,
          PUSH_CHAIN_CONTRACT_ADDRESSES.RESOLVER,
          [],
          { value: price }
        );
        
        await registerTx.wait();
        console.log(`Registration transaction: ${registerTx.hash}`);
        testResults.transactions.registration = registerTx.hash;
        testResults.registered = true;
        
        // Step 5: Verify the registration
        console.log("\nStep 5: Verifying the registration");
        
        // Calculate the namehash
        const rootNode = ethers.namehash("push");
        console.log(`Root node: ${rootNode}`);
        
        const labelHash = ethers.keccak256(ethers.toUtf8Bytes(testName));
        console.log(`Label hash: ${labelHash}`);
        
        const tokenId = BigInt(labelHash);
        console.log(`Token ID: ${tokenId}`);
        testResults.tokenId = tokenId.toString();
        
        // Check if we now own the name
        const owner = await registrar.ownerOf(tokenId);
        console.log(`Owner: ${owner}`);
        testResults.owner = owner;
        
        const isOwner = owner.toLowerCase() === deployer.address.toLowerCase();
        console.log(`Is owner? ${isOwner}`);
        
        if (!isOwner) {
          console.error("Registration may have failed - we don't own the name.");
          return;
        }
        
        // Calculate the node
        // namehash = keccak256(rootNode + labelHash)
        // In ethereumjs-util: namehash = keccak256(Buffer.concat([rootNode, labelHash]))
        // In ethers: namehash = keccak256(concat([rootNode, labelHash]))
        const namehash = ethers.keccak256(
          ethers.concat([rootNode, labelHash])
        );
        console.log(`Namehash: ${namehash}`);
        testResults.namehash = namehash;
        
        // Step 6: Set and resolve an address
        console.log("\nStep 6: Setting and resolving an address");
        
        // Set our address as the resolved address
        const setAddrTx = await resolver.setAddr(namehash, deployer.address);
        await setAddrTx.wait();
        console.log(`Set address transaction: ${setAddrTx.hash}`);
        testResults.transactions.setAddress = setAddrTx.hash;
        
        // Resolve the address
        const resolvedAddress = await resolver.addr(namehash);
        console.log(`Resolved address: ${resolvedAddress}`);
        testResults.resolvedAddress = resolvedAddress;
        
        // Step 7: Testing multi-chain address functionality
        console.log("\nStep 7: Testing multi-chain address functionality");

        // Define coin types for SLIP-44
        const BTC_COIN_TYPE = 0;
        const ETH_COIN_TYPE = 60;
        const SOLANA_COIN_TYPE = 501;
        const POLYGON_COIN_TYPE = 966;
        const ARBITRUM_COIN_TYPE = 60; // Arbitrum uses the same coin type as Ethereum
        const OPTIMISM_COIN_TYPE = 60; // Optimism uses the same coin type as Ethereum

        // 7.1: Bitcoin address test
        try {
          console.log("\n7.1: Setting and retrieving Bitcoin address (SLIP-44 coin type 0)");
          const btcAddress = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"; // Satoshi's address
          
          // Convert string to bytes
          const btcAddressBytes = ethers.toUtf8Bytes(btcAddress);
          console.log(`- Setting BTC address: ${btcAddress}`);
          console.log(`- BTC address bytes: ${ethers.hexlify(btcAddressBytes)}`);
          
          // Set Bitcoin address
          const btcSetTx = await resolver["setAddr(bytes32,uint256,bytes)"](
            namehash,
            BTC_COIN_TYPE,
            btcAddressBytes
          );
          await btcSetTx.wait();
          console.log(`- BTC address set transaction: ${btcSetTx.hash}`);
          
          // Wait a moment for the blockchain to process
          console.log("- Waiting for transaction to be processed...");
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Retrieve Bitcoin address
          const retrievedBtcBytes = await resolver["addr(bytes32,uint256)"](
            namehash,
            BTC_COIN_TYPE
          );
          
          console.log(`- Retrieved BTC bytes (hex): ${ethers.hexlify(retrievedBtcBytes)}`);
          console.log(`- Retrieved BTC bytes length: ${retrievedBtcBytes.length}`);
          
          // Safely convert bytes to string
          let retrievedBtcAddress = "";
          try {
            // Try to decode the bytes as UTF-8
            retrievedBtcAddress = ethers.toUtf8String(retrievedBtcBytes);
          } catch (decodeError) {
            console.log(`- [Warning] Could not decode retrieved bytes as UTF-8: ${decodeError instanceof Error ? decodeError.message : decodeError}`);
          }
          console.log(`- Retrieved BTC address: ${retrievedBtcAddress}`);
          
          // Verify
          if (retrievedBtcAddress === btcAddress) {
            console.log("✅ BTC address test passed");
          } else {
            console.log(`❌ BTC address test failed (expected: ${btcAddress}, got: ${retrievedBtcAddress})`);
          }
        } catch (error) {
          console.log(`BTC address test error: ${error instanceof Error ? error.message : error}`);
        }

        // 7.2: ETH legacy method and cross-compatibility test
        try {
          console.log("\n7.2: Testing ETH address with legacy and multi-chain methods");
          const ethAddress = "0x000000000000000000000000000000000000dEaD";
          
          console.log(`- Setting ETH address (legacy method): ${ethAddress}`);
          
          // Set ETH address using legacy method
          const ethSetTx = await resolver["setAddr(bytes32,address)"](
            namehash,
            ethAddress
          );
          await ethSetTx.wait();
          console.log(`- ETH address set transaction (legacy): ${ethSetTx.hash}`);
          
          // Wait a moment for the blockchain to process
          console.log("- Waiting for transaction to be processed...");
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Retrieve with legacy method (addr(bytes32))
          const retrievedEthLegacy = await resolver["addr(bytes32)"](namehash);
          console.log(`- Retrieved ETH address (legacy method): ${retrievedEthLegacy}`);
          
          // Retrieve with multi-chain method (addr(bytes32,uint256))
          const retrievedEthBytes = await resolver["addr(bytes32,uint256)"](
            namehash,
            ETH_COIN_TYPE
          );
          
          // Show raw bytes
          console.log(`- Retrieved ETH bytes (multi-chain method): ${ethers.hexlify(retrievedEthBytes)}`);
          
          try {
            if (retrievedEthBytes.length > 0) {
              // Convert bytes to address
              const retrievedEthMultiChain = ethers.getAddress(ethers.hexlify(retrievedEthBytes));
              console.log(`- Retrieved ETH address (multi-chain method): ${retrievedEthMultiChain}`);
              
              // Verify cross-compatibility
              const legacyMatch = retrievedEthLegacy.toLowerCase() === ethAddress.toLowerCase();
              const multiChainMatch = retrievedEthMultiChain.toLowerCase() === ethAddress.toLowerCase();
              
              if (legacyMatch && multiChainMatch) {
                console.log("✅ ETH address test passed (both methods)");
                console.log("✅ Cross-compatibility confirmed!");
              } else {
                if (!legacyMatch) {
                  console.log(`❌ ETH address test failed (legacy method)`);
                }
                if (!multiChainMatch) {
                  console.log(`❌ ETH address test failed (multi-chain method)`);
                }
              }
            } else {
              console.log("❌ ETH address bytes empty (multi-chain method)");
            }
          } catch (error) {
            console.log(`- Error converting ETH bytes to address: ${error instanceof Error ? error.message : error}`);
          }
        } catch (error) {
          console.log(`ETH address test error: ${error instanceof Error ? error.message : error}`);
        }

        // 7.3: Solana address test
        try {
          console.log("\n7.3: Setting and retrieving Solana address (SLIP-44 coin type 501)");
          const solAddress = "Ghj4jFiKXDr1zDQFQzQHqiN4zDnh8mV8YZ6L8Z6zx8TY"; // Example Solana address
          
          // Convert string to bytes
          const solAddressBytes = ethers.toUtf8Bytes(solAddress);
          console.log(`- Setting Solana address: ${solAddress}`);
          console.log(`- Solana address bytes: ${ethers.hexlify(solAddressBytes)}`);
          
          // Set Solana address
          const solSetTx = await resolver["setAddr(bytes32,uint256,bytes)"](
            namehash,
            SOLANA_COIN_TYPE,
            solAddressBytes
          );
          await solSetTx.wait();
          console.log(`- Solana address set transaction: ${solSetTx.hash}`);
          
          // Wait a moment for the blockchain to process
          console.log("- Waiting for transaction to be processed...");
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Retrieve Solana address
          const retrievedSolBytes = await resolver["addr(bytes32,uint256)"](
            namehash,
            SOLANA_COIN_TYPE
          );
          
          console.log(`- Retrieved Solana bytes (hex): ${ethers.hexlify(retrievedSolBytes)}`);
          
          // Safely convert bytes to string
          let retrievedSolAddress = "";
          try {
            retrievedSolAddress = ethers.toUtf8String(retrievedSolBytes);
          } catch (decodeError) {
            console.log(`- [Warning] Could not decode retrieved bytes as UTF-8: ${decodeError instanceof Error ? decodeError.message : decodeError}`);
          }
          console.log(`- Retrieved Solana address: ${retrievedSolAddress}`);
          
          // Verify
          if (retrievedSolAddress === solAddress) {
            console.log("✅ Solana address test passed");
          } else {
            console.log(`❌ Solana address test failed (expected: ${solAddress}, got: ${retrievedSolAddress})`);
          }
        } catch (error) {
          console.log(`Solana address test error: ${error instanceof Error ? error.message : error}`);
        }

        // 7.4: L2 addresses test - Polygon, Arbitrum, Optimism
        try {
          console.log("\n7.4: Testing L2 blockchain addresses");
          
          // Test Polygon address
          const polygonAddress = "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c";
          console.log(`\n- Setting Polygon address (SLIP-44 coin type ${POLYGON_COIN_TYPE}): ${polygonAddress}`);
          
          // Convert address to bytes for storage
          const polygonAddressBytes = ethers.getBytes(polygonAddress);
          
          // Set Polygon address
          const polygonSetTx = await resolver["setAddr(bytes32,uint256,bytes)"](
            namehash,
            POLYGON_COIN_TYPE,
            polygonAddressBytes
          );
          await polygonSetTx.wait();
          console.log(`- Polygon address set transaction: ${polygonSetTx.hash}`);
          
          // Wait for transaction processing
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Retrieve Polygon address
          const retrievedPolygonBytes = await resolver["addr(bytes32,uint256)"](
            namehash,
            POLYGON_COIN_TYPE
          );
          
          console.log(`- Retrieved Polygon bytes (hex): ${ethers.hexlify(retrievedPolygonBytes)}`);
          
          // Convert bytes back to address
          if (retrievedPolygonBytes.length > 0) {
            const retrievedPolygonAddress = ethers.getAddress(ethers.hexlify(retrievedPolygonBytes));
            console.log(`- Retrieved Polygon address: ${retrievedPolygonAddress}`);
            
            // Verify
            if (retrievedPolygonAddress.toLowerCase() === polygonAddress.toLowerCase()) {
              console.log("✅ Polygon address test passed");
            } else {
              console.log(`❌ Polygon address test failed (expected: ${polygonAddress}, got: ${retrievedPolygonAddress})`);
            }
          } else {
            console.log("❌ Polygon address bytes empty");
          }

          // Test Arbitrum address
          const arbitrumAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
          console.log(`\n- Setting Arbitrum address (SLIP-44 coin type ${ARBITRUM_COIN_TYPE}): ${arbitrumAddress}`);
          
          // Convert address to bytes for storage
          const arbitrumAddressBytes = ethers.getBytes(arbitrumAddress);
          
          // Set Arbitrum address
          const arbitrumSetTx = await resolver["setAddr(bytes32,uint256,bytes)"](
            namehash,
            ARBITRUM_COIN_TYPE,
            arbitrumAddressBytes
          );
          await arbitrumSetTx.wait();
          console.log(`- Arbitrum address set transaction: ${arbitrumSetTx.hash}`);
          
          // Wait for transaction processing
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Retrieve Arbitrum address
          const retrievedArbitrumBytes = await resolver["addr(bytes32,uint256)"](
            namehash,
            ARBITRUM_COIN_TYPE
          );
          
          console.log(`- Retrieved Arbitrum bytes (hex): ${ethers.hexlify(retrievedArbitrumBytes)}`);
          
          // Convert bytes back to address
          if (retrievedArbitrumBytes.length > 0) {
            const retrievedArbitrumAddress = ethers.getAddress(ethers.hexlify(retrievedArbitrumBytes));
            console.log(`- Retrieved Arbitrum address: ${retrievedArbitrumAddress}`);
            
            // Verify
            if (retrievedArbitrumAddress.toLowerCase() === arbitrumAddress.toLowerCase()) {
              console.log("✅ Arbitrum address test passed");
            } else {
              console.log(`❌ Arbitrum address test failed (expected: ${arbitrumAddress}, got: ${retrievedArbitrumAddress})`);
            }
          } else {
            console.log("❌ Arbitrum address bytes empty");
          }

          // Test Optimism address
          const optimismAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
          console.log(`\n- Setting Optimism address (SLIP-44 coin type ${OPTIMISM_COIN_TYPE}): ${optimismAddress}`);
          
          // Convert address to bytes for storage
          const optimismAddressBytes = ethers.getBytes(optimismAddress);
          
          // Set Optimism address
          const optimismSetTx = await resolver["setAddr(bytes32,uint256,bytes)"](
            namehash,
            OPTIMISM_COIN_TYPE,
            optimismAddressBytes
          );
          await optimismSetTx.wait();
          console.log(`- Optimism address set transaction: ${optimismSetTx.hash}`);
          
          // Wait for transaction processing
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Retrieve Optimism address
          const retrievedOptimismBytes = await resolver["addr(bytes32,uint256)"](
            namehash,
            OPTIMISM_COIN_TYPE
          );
          
          console.log(`- Retrieved Optimism bytes (hex): ${ethers.hexlify(retrievedOptimismBytes)}`);
          
          // Convert bytes back to address
          if (retrievedOptimismBytes.length > 0) {
            const retrievedOptimismAddress = ethers.getAddress(ethers.hexlify(retrievedOptimismBytes));
            console.log(`- Retrieved Optimism address: ${retrievedOptimismAddress}`);
            
            // Verify
            if (retrievedOptimismAddress.toLowerCase() === optimismAddress.toLowerCase()) {
              console.log("✅ Optimism address test passed");
            } else {
              console.log(`❌ Optimism address test failed (expected: ${optimismAddress}, got: ${retrievedOptimismAddress})`);
            }
          } else {
            console.log("❌ Optimism address bytes empty");
          }
          
        } catch (error) {
          console.log(`L2 address test error: ${error instanceof Error ? error.message : error}`);
        }

        // Step 8: Print summary
        console.log("\nStep 8: Test summary");
        
        console.log("\nTest Results:");
        console.log(`- Domain: ${testResults.testName}.push`);
        console.log(`- Registered: ${testResults.registered}`);
        
        console.log("\nOwnership Details:");
        console.log(`- Owner Address: ${testResults.owner}`);
        console.log(`- Resolved Address: ${testResults.resolvedAddress}`);
        console.log(`- Test Account: ${testResults.tester}`);
        
        console.log("\nContract Addresses:");
        console.log(`- Registry: ${testResults.contracts.REGISTRY}`);
        console.log(`- Registrar: ${testResults.contracts.REGISTRAR}`);
        console.log(`- Controller: ${testResults.contracts.CONTROLLER}`);
        console.log(`- Resolver: ${testResults.contracts.RESOLVER}`);
        console.log(`- Price Oracle: ${testResults.contracts.PRICE_ORACLE}`);
        console.log(`- Name Registry: ${testResults.contracts.NAME_REGISTRY}`);
        
        console.log("\nTransactions:");
        console.log(`- Commit: ${testResults.transactions.commitment}`);
        console.log(`- Register: ${testResults.transactions.registration}`);
        console.log(`- Set Address: ${testResults.transactions.setAddress}`);
        
        console.log("\nExplorer Links:");
        console.log(`- Commit TX: https://explorer.testnet.push.org/tx/${testResults.transactions.commitment}`);
        console.log(`- Register TX: https://explorer.testnet.push.org/tx/${testResults.transactions.registration}`);
        console.log(`- Set Address TX: https://explorer.testnet.push.org/tx/${testResults.transactions.setAddress}`);
        
        console.log("\nTo view this name in the frontend:");
        console.log(`1. Connect your wallet (${testResults.tester}) to Push Chain`);
        console.log(`2. Go to the Manage section to see ${testResults.testName}.push`);
        
      } catch (registerError) {
        console.error("Registration failed:", registerError);
        
        // If registration fails, it might be because the commitment age hasn't passed
        // on the actual network, which could have a minimum commitment age > our test value
        console.log("\nRegistration might have failed due to commitment age not passing yet.");
        console.log("This can happen if the actual commitment age is longer than our test value.");
        console.log("Consider increasing the TEST_COMMITMENT_AGE value in the script.");
      }
      
    } catch (error) {
      console.error("Test failed with error:", error);
    }
  });
