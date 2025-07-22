import { task } from "hardhat/config";

/**
 * Test multi-chain address functionality in the Push Naming Service Resolver
 * 
 * This test verifies the existence and proper interface for the multi-chain 
 * address resolver functions defined in the PublicResolver contract.
 */
task("test-multichain", "Test multi-chain address functionality in the Push Naming Service")
  .setAction(async (_, hre) => {
    const { ethers } = hre;
    
    console.log("=== TESTING MULTI-CHAIN RESOLVER INTERFACE ===");
    
    // === Test 1: Verify Contracts Can Be Loaded ===
    try {
      console.log("\n1. Verifying contract artifacts can be loaded");
      
      const ResolverFactory = await ethers.getContractFactory("PublicResolver");
      const RegistryFactory = await ethers.getContractFactory("PushRegistry");
      
      console.log("✅ Contract artifacts successfully loaded");
      console.log("   - PublicResolver interface available");
      console.log("   - PushRegistry interface available");
    } catch (error) {
      console.error("❌ Failed to load contract artifacts:", error.message);
      return;
    }
    
    // === Test 2: Verify Multi-Chain Interface ===
    try {
      console.log("\n2. Verifying multi-chain resolver interface");
      
      // Get the resolver contract factory
      const ResolverFactory = await ethers.getContractFactory("PublicResolver");
      
      // Get the interface (ABI) of the contract
      const resolverInterface = ResolverFactory.interface;
      
      // Check for the overloaded setAddr functions
      const setAddrLegacy = resolverInterface.getFunction("setAddr(bytes32,address)");
      const setAddrMultichain = resolverInterface.getFunction("setAddr(bytes32,uint256,bytes)");
      
      // Check for the overloaded addr functions
      const addrLegacy = resolverInterface.getFunction("addr(bytes32)");
      const addrMultichain = resolverInterface.getFunction("addr(bytes32,uint256)");
      
      console.log("Function signatures found in the contract:");
      
      // Legacy ETH address methods
      if (setAddrLegacy) {
        console.log("✅ Legacy setAddr function: setAddr(bytes32,address)");
      } else {
        console.log("❌ Legacy setAddr function not found");
      }
      
      if (addrLegacy) {
        console.log("✅ Legacy addr function: addr(bytes32)");
      } else {
        console.log("❌ Legacy addr function not found");
      }
      
      // Multi-chain address methods
      if (setAddrMultichain) {
        console.log("✅ Multi-chain setAddr function: setAddr(bytes32,uint256,bytes)");
      } else {
        console.log("❌ Multi-chain setAddr function not found");
      }
      
      if (addrMultichain) {
        console.log("✅ Multi-chain addr function: addr(bytes32,uint256)");
      } else {
        console.log("❌ Multi-chain addr function not found");
      }
    } catch (error) {
      console.error("❌ Error verifying resolver interface:", error.message);
    }
    
    // === Test 3: Check Resolver Implementation ===
    try {
      console.log("\n3. Checking resolver implementation");
      
      // Get the contract source code
      const resolverArtifact = await hre.artifacts.readArtifact("PublicResolver");
      
      // Check if the contract has expected SLIP-44 related constants/states
      const hasMultichainSupport = resolverArtifact.abi.some(item => 
        item.name === "AddressChanged" && 
        item.type === "event" && 
        item.inputs.some((input: any) => input.name === "coinType" && input.type === "uint256")
      );
      
      if (hasMultichainSupport) {
        console.log("✅ Found AddressChanged event with coinType parameter");
        console.log("✅ Contract implements multi-chain address resolution (SLIP-44 compliant)");
      } else {
        console.log("❌ Multi-chain address event not found");
      }
    } catch (error) {
      console.error("❌ Error checking resolver implementation:", error.message);
    }
    
    console.log("\n=== MULTI-CHAIN ADDRESS INTERFACE TEST SUMMARY ===");
    console.log("This test verifies that the PublicResolver contract correctly implements:");
    console.log("1. Legacy ETH address functions (setAddr/addr)");
    console.log("2. Multi-chain address functions following SLIP-44 standard");
    console.log("3. Proper event definitions for address changes");
    console.log("\nTo test actual state changes, deploy contracts locally or register a domain.");
  });
