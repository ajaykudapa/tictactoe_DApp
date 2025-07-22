import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0xD0F49d8bEAd6d928dda62dc1Ba86Ed31d901eBAB";

const ABI = [
  {
    inputs: [
      { internalType: "string", name: "gameCode", type: "string" },
      { internalType: "address", name: "opponent", type: "address" },
      { internalType: "uint8[]", name: "moves", type: "uint8[]" },
      { internalType: "string", name: "result", type: "string" }
    ],
    name: "submitGame",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

export const getContract = async () => {
  if (!window.ethereum) throw new Error("No wallet detected");
  const provider = new ethers.BrowserProvider(window.ethereum); // ethers v6
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
};
