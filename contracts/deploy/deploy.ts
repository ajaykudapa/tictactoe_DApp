// scripts/deploy.ts
import { ethers, run } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy PushRegistry
    console.log("Deploying PushRegistry...");
    const PushRegistry = await ethers.getContractFactory("PushRegistry");
    const pushRegistry = await PushRegistry.deploy();
    await pushRegistry.waitForDeployment();
    const pushRegistryAddress = await pushRegistry.getAddress();
    console.log("PushRegistry deployed to:", pushRegistryAddress);

    // 2. Deploy PriceOracle with extremely reduced prices
    // Ultra-low prices since faucet only gives 0.1 PUSH
    // We need to ensure a 1-year registration costs less than 0.1 PUSH
    // Considering 365 days, pricing needs to be very low per day
    const prices = [
        ethers.parseEther("0.0002"),  // 1 letter: 0.0002 PUSH per day (0.073 PUSH per year)
        ethers.parseEther("0.0001"),  // 2 letters: 0.0001 PUSH per day (0.0365 PUSH per year)
        ethers.parseEther("0.00005"), // 3 letters: 0.00005 PUSH per day (0.01825 PUSH per year)
        ethers.parseEther("0.00002"), // 4 letters: 0.00002 PUSH per day (0.0073 PUSH per year)
        ethers.parseEther("0.00001"), // 5+ letters: 0.00001 PUSH per day (0.00365 PUSH per year)
    ];
    
    console.log("Deploying PriceOracle with ultra-low prices...");
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy(prices);
    await priceOracle.waitForDeployment();
    const priceOracleAddress = await priceOracle.getAddress();
    console.log("PriceOracle deployed to:", priceOracleAddress);

    // 3. Deploy BaseRegistrar
    console.log("Deploying BaseRegistrar...");
    const BaseRegistrar = await ethers.getContractFactory("BaseRegistrar");
    const baseNode = ethers.namehash("push");
    const pushRegistrar = await BaseRegistrar.deploy(
        pushRegistryAddress,
        baseNode
    );
    await pushRegistrar.waitForDeployment();
    const pushRegistrarAddress = await pushRegistrar.getAddress();
    console.log("BaseRegistrar deployed to:", pushRegistrarAddress);

    // 4. Deploy PublicResolver
    console.log("Deploying PublicResolver...");
    const PublicResolver = await ethers.getContractFactory("PublicResolver");
    const resolver = await PublicResolver.deploy(
        pushRegistryAddress,
        pushRegistrarAddress // trustedController is the registrar
    );
    await resolver.waitForDeployment();
    const resolverAddress = await resolver.getAddress();
    console.log("PublicResolver deployed to:", resolverAddress);

    // 5. Deploy NameRegistry for reverse lookup
    console.log("Deploying NameRegistry...");
    const NameRegistry = await ethers.getContractFactory("NameRegistry");
    const nameRegistry = await NameRegistry.deploy();
    await nameRegistry.waitForDeployment();
    const nameRegistryAddress = await nameRegistry.getAddress();
    console.log("NameRegistry deployed to:", nameRegistryAddress);

    // 6. Deploy RegistrarController with reduced commitment age for easier testing
    console.log("Deploying RegistrarController...");
    const RegistrarController = await ethers.getContractFactory("PushRegistrarController");
    const minCommitmentAge = 60; // 1 minute
    const maxCommitmentAge = 24 * 60 * 60; // 24 hours
    const registrarController = await RegistrarController.deploy(
        pushRegistrarAddress,
        priceOracleAddress,
        minCommitmentAge,
        maxCommitmentAge,
        nameRegistryAddress
    );
    await registrarController.waitForDeployment();
    const registrarControllerAddress = await registrarController.getAddress();
    console.log("RegistrarController deployed to:", registrarControllerAddress);

    // Setup steps
    console.log("\nPerforming setup steps...");

    // 1. Set controller in registrar
    const controllerTx = await pushRegistrar.addController(registrarControllerAddress);
    await controllerTx.wait();
    console.log("Controller added to Registrar");

    // 2. Authorize controller in NameRegistry
    console.log("Authorizing controller in NameRegistry...");
    // Check if controller is already authorized
    const isAuthorized = await nameRegistry.controllers(registrarControllerAddress);
    if (isAuthorized) {
        console.log("Controller is already authorized in NameRegistry!");
    } else {
        // Add controller if not authorized
        console.log("Adding controller as authorized in NameRegistry...");
        const authorizeTx = await nameRegistry.addController(registrarControllerAddress);
        console.log(`Authorization transaction submitted: ${authorizeTx.hash}`);
        
        // Wait for the transaction to be mined
        await authorizeTx.wait();
        
        // Verify controller is now authorized
        const isNowAuthorized = await nameRegistry.controllers(registrarControllerAddress);
        if (isNowAuthorized) {
            console.log("✅ Controller successfully authorized in NameRegistry!");
        } else {
            console.log("❌ Failed to authorize controller in NameRegistry!");
        }
    }

    // 3. Set baseNode owner in registry to registrar
    const label = ethers.keccak256(ethers.toUtf8Bytes("push"));
    const setSubnodeTx = await pushRegistry.setSubnodeOwner(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        label,
        pushRegistrarAddress
    );
    await setSubnodeTx.wait();
    console.log("Registrar set as owner of baseNode in Registry");

    // 4. Set resolver for baseNode
    const setResolverTx = await pushRegistrar.setResolver(resolverAddress);
    await setResolverTx.wait();
    console.log("Resolver set for baseNode");

    // Verify contracts on the explorer
    console.log("\nVerifying contracts on explorer...");
    
    try {
        console.log("Verifying PushRegistry...");
        await run("verify:verify", {
            address: pushRegistryAddress,
            constructorArguments: [],
        });
        
        console.log("Verifying PriceOracle...");
        await run("verify:verify", {
            address: priceOracleAddress,
            constructorArguments: [prices],
        });
        
        console.log("Verifying BaseRegistrar...");
        await run("verify:verify", {
            address: pushRegistrarAddress,
            constructorArguments: [pushRegistryAddress, baseNode],
        });
        
        console.log("Verifying PublicResolver...");
        await run("verify:verify", {
            address: resolverAddress,
            constructorArguments: [pushRegistryAddress, pushRegistrarAddress],
        });
        
        console.log("Verifying NameRegistry...");
        await run("verify:verify", {
            address: nameRegistryAddress,
            constructorArguments: [],
        });
        
        console.log("Verifying RegistrarController...");
        await run("verify:verify", {
            address: registrarControllerAddress,
            constructorArguments: [
                pushRegistrarAddress,
                priceOracleAddress,
                minCommitmentAge,
                maxCommitmentAge,
                nameRegistryAddress
            ],
        });
    } catch (error) {
        console.error("Contract verification failed:", error);
    }

    console.log("\nDeployment, setup, and verification completed!");
    console.log("\nDeployed Contracts:");
    console.log("-------------------");
    console.log("PushRegistry:", pushRegistryAddress);
    console.log("PriceOracle:", priceOracleAddress);
    console.log("BaseRegistrar:", pushRegistrarAddress);
    console.log("PublicResolver:", resolverAddress);
    console.log("NameRegistry:", nameRegistryAddress);
    console.log("RegistrarController:", registrarControllerAddress);
    
    // Save all addresses to deployments.txt
    console.log("\nUpdating deployments.txt file...");
    
    const deploymentInfo = `
PUSH_CHAIN_CONTRACT_ADDRESSES = {
  REGISTRY: "${pushRegistryAddress}",
  PRICE_ORACLE: "${priceOracleAddress}",
  REGISTRAR: "${pushRegistrarAddress}",
  RESOLVER: "${resolverAddress}", 
  NAME_REGISTRY: "${nameRegistryAddress}",
  CONTROLLER: "${registrarControllerAddress}"
}
    `;
    
    // This will be handled by a separate script or manually
    console.log("Add the following to your deployments.txt file:");
    console.log(deploymentInfo);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });