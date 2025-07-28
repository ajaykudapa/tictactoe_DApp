"use client";
import React from "react";
import { db } from "@/firebase";
import { ref, set } from "firebase/database";

interface CreateGameProps {
  setGameCode: (code: string) => void;
  setPlayer: (player: string) => void;
}

const CreateGame = ({ setGameCode, setPlayer }: CreateGameProps) => {
  const handleCreate = () => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    set(ref(db, `games/${code}`), {
      board: Array(9).fill(""),
      turn: "X",
      winner: null,
    });
    setGameCode(code);
    setPlayer("X");
  };

  return (
    <button
      onClick={handleCreate}
      className="px-4 py-2 rounded-md bg-white text-purple-800 font-bold hover:bg-purple-100"
    >
      Create Game
    </button>
  );
};

export default CreateGame;
