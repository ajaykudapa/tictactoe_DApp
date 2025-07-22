'use client';

import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import TTTApp from "@/components/tictactoe/TTTApp";

export default function TicTacToePage() {
  const [blockNumber, setBlockNumber] = useState<number | null>(null);

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        const provider = new ethers.JsonRpcProvider('https://rpc-testnet.push.org');
        const block = await provider.getBlockNumber();
        console.log('Fetched block number:', block);
        setBlockNumber(block);
      } catch (error) {
        console.error('Error fetching block:', error);
      }
    };

    fetchBlock();
  }, []);

  return (
    <div>
      <h1>Push Chain Tic-Tac-Toe</h1>
      <p>Current Push Chain block: {blockNumber ?? 'Loading...'}</p>
      <TTTApp />
    </div>
  );
}
