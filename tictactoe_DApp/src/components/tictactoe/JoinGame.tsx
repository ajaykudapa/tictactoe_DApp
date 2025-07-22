"use client";
import React, { useState } from "react";
import { db } from "@/firebase";
import { ref, get } from "firebase/database";

const JoinGame = ({ setGameCode, setPlayer }: any) => {
  const [inputCode, setInputCode] = useState("");

  const handleJoin = async () => {
    const gameRef = ref(db, `games/${inputCode}`);
    const snap = await get(gameRef);
    if (snap.exists()) {
      setGameCode(inputCode);
      setPlayer("O");
    } else {
      alert("Game not found.");
    }
  };

  return (
    <div className="flex flex-col gap-2 items-center">
      <input
        type="text"
        placeholder="Enter Game Code"
        value={inputCode}
        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
        className="p-2 rounded-md border border-purple-300 text-purple-900 w-48 text-center"
      />
      <button
        onClick={handleJoin}
        className="px-4 py-2 rounded-md bg-white text-purple-800 font-bold hover:bg-purple-100"
      >
        Join Game
      </button>
    </div>
  );
};

export default JoinGame;
