// Script to authorize the RegistrarController to use the NameRegistry
const hre = require("hardhat");

async function main() {
  console.log("Starting controller authorization script...");
  
  const nameRegistryAddress = "0x6F4d2D62E7F03e6838166c13bd89a9D56E6516FF";
  const controllerAddress = "0x71ca01A355A5c5049722f3388F29723481f5cF91";
  
  console.log(`NameRegistry address: ${nameRegistryAddress}`);
  console.log(`Controller address: ${controllerAddress}`);
  
  // Get the contract instance
  const NameRegistry = await hre.ethers.getContractFactory("NameRegistry");
  const nameRegistry = await NameRegistry.attach(nameRegistryAddress);
  
  // Check if controller is already authorized
  const isAuthorized = await nameRegistry.controllers(controllerAddress);
  if (isAuthorized) {
    console.log("Controller is already authorized!");
    return;
  }
  
  // Add controller if not authorized
  console.log("Adding controller as authorized...");
  const tx = await nameRegistry.addController(controllerAddress);
  console.log(`Transaction submitted: ${tx.hash}`);
  
  // Wait for the transaction to be mined
  console.log("Waiting for transaction confirmation...");
  await tx.wait();
  
  // Verify controller is now authorized
  const isNowAuthorized = await nameRegistry.controllers(controllerAddress);
  if (isNowAuthorized) {
    console.log("✅ Controller successfully authorized!");
  } else {
    console.log("❌ Failed to authorize controller!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error in authorization script:", error);
    process.exit(1);
  });
