"use client";
import React, { useEffect, useState } from "react";
import { db } from "@/firebase";
import { ref, onValue, update } from "firebase/database";
import { getContract } from "@/utils/contract";

const GameBoard = ({
  gameCode,
  player,
  setPlayer,
}: {
  gameCode: string;
  player: string;
  setPlayer: (p: string) => void;
}) => {
  const [board, setBoard] = useState(Array(9).fill(""));
  const [turn, setTurn] = useState("X");
  const [winner, setWinner] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [submitted, setSubmitted] = useState(false); // prevent double-submit

  useEffect(() => {
    const boardRef = ref(db, `games/${gameCode}/board`);
    const turnRef = ref(db, `games/${gameCode}/turn`);
    const winnerRef = ref(db, `games/${gameCode}/winner`);

    const unsub1 = onValue(boardRef, (snap) => {
      if (snap.exists()) {
        const boardData = snap.val();
        setBoard(boardData);
        checkDraw(boardData);
      }
    });

    const unsub2 = onValue(turnRef, (snap) => snap.exists() && setTurn(snap.val()));
    const unsub3 = onValue(winnerRef, (snap) => snap.exists() && setWinner(snap.val()));

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [gameCode]);

  const handleClick = async (i: number) => {
    if (board[i] || winner || isDraw || turn !== player) return;

    const newBoard = [...board];
    newBoard[i] = player;

    const newTurn = player === "X" ? "O" : "X";
    const win = checkWinner(newBoard);
    const draw = !win && newBoard.every((cell) => cell !== "");

    await update(ref(db, `games/${gameCode}`), {
      board: newBoard,
      turn: win ? turn : newTurn,
      winner: win,
    });

    setIsDraw(draw);
  };

  const checkWinner = (b: string[]) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (const [a, b1, c] of lines) {
      if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
    }
    return null;
  };

  const checkDraw = (b: string[]) => {
    if (!winner && b.every((cell) => cell !== "")) {
      setIsDraw(true);
    }
  };

  const submitGameToChain = async () => {
    if (submitted) return; // prevent duplicate submission
    setSubmitted(true);
    try {
      const contract = await getContract();
      const opponent = "0x0000000000000000000000000000000000000000"; // optional for now
      const result = winner ? "WIN" : isDraw ? "DRAW" : "LOSS";
      const moves = board
        .map((val, idx) => (val !== "" ? idx : null))
        .filter((i) => i !== null);

      const tx = await contract.submitGame(gameCode, opponent, moves, result);
      await tx.wait();
      console.log("✅ Game submitted on-chain!");
    } catch (error) {
      console.error("❌ Failed to submit game:", error);
    }
  };

  const handleRematch = async () => {
    const newPlayer = player === "X" ? "O" : "X";
    setPlayer(newPlayer);

    await update(ref(db, `games/${gameCode}`), {
      board: Array(9).fill(""),
      turn: "X",
      winner: null,
    });

    setWinner(null);
    setIsDraw(false);
    setSubmitted(false);
  };

  // ⛓️ Submit to contract when game ends
  useEffect(() => {
    if ((winner || isDraw) && !submitted) {
      submitGameToChain();
    }
  }, [winner, isDraw, submitted, submitGameToChain]);

  // Check for draw when board changes
  useEffect(() => {
    checkDraw(board);
  }, [board, winner, checkDraw]);

  return (
    <div className="flex flex-col items-center gap-4 mt-4 text-white">
      <h2 className="text-xl font-bold">Game Code: {gameCode}</h2>
      <h3 className="text-lg">You are: {player}</h3>
      <h3 className="text-lg">
        {winner
          ? `🎉 Winner: ${winner}`
          : isDraw
          ? "🤝 It's a Draw!"
          : turn === player
          ? "Your Turn"
          : "Opponent's Turn"}
      </h3>

      <div className="grid grid-cols-3 gap-4 mt-4">
        {board.map((val, i) => (
          <button
            key={i}
            className={`w-20 h-20 rounded-xl text-3xl font-bold bg-white text-black disabled:opacity-60`}
            onClick={() => handleClick(i)}
            disabled={!!val || !!winner || isDraw}
          >
            {val}
          </button>
        ))}
      </div>

      {(winner || isDraw) && (
        <button
          onClick={handleRematch}
          className="mt-4 px-4 py-2 rounded-md bg-white text-purple-800 hover:bg-purple-100"
        >
          🔁 Rematch (Switch Sides)
        </button>
      )}
    </div>
  );
};

export default GameBoard;
