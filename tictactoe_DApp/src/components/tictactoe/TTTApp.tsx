"use client";
import React, { useState } from "react";
import CreateGame from "./CreateGame";
import JoinGame from "./JoinGame";
import GameBoard from "./GameBoard";

const TTTApp = () => {
  const [gameCode, setGameCode] = useState("");
  const [player, setPlayer] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-purple-500 text-white flex flex-col items-center pt-12">
      {!gameCode ? (
        <div className="flex flex-col gap-4 items-center">
          <CreateGame setGameCode={setGameCode} setPlayer={setPlayer} />
          <JoinGame setGameCode={setGameCode} setPlayer={setPlayer} />
        </div>
      ) : (
        <GameBoard gameCode={gameCode} player={player} setPlayer={setPlayer} />
      )}
    </div>
  );
};

export default TTTApp;
