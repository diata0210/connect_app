import React, { useState } from 'react';
import { GameSession, User, TruthOrLieGameData } from '../../pages/Games'; // Adjust path as needed

export interface TruthLieRound {
  playerMakingStatements: string;
  statements: { text: string; isTruth: boolean }[];
  guesser: string;
  guess: number | null; // Changed from undefined to null for Firestore compatibility
  isCorrect: boolean | null; // Changed from undefined to null for Firestore compatibility
}

interface TruthOrLieGameProps {
  gameSession: GameSession;
  currentUser: User;
  opponent: User | null; // Added opponent prop
  onTruthLieSubmit: (statements: string[], truthIndex: number) => Promise<void>;
  onTruthLieGuess: (roundIndex: number, statementIndex: number) => Promise<void>;
  // Props passed from Games.tsx that might be specific to this component's direct children or logic
  onAbandonGame: () => Promise<void>;
}

const TruthOrLieGame: React.FC<TruthOrLieGameProps> = ({
  gameSession,
  currentUser,
  opponent, // Added opponent
  onTruthLieSubmit, // Using this for submitting statements
  onTruthLieGuess,  // Using this for guessing
  onAbandonGame,
}) => {
  const [localStatements, setLocalStatements] = useState<string[]>(["", ""]); // Changed to two statements
  const [localTruthIndex, setLocalTruthIndex] = useState<number | null>(null);
  const gameData = gameSession.gameData as TruthOrLieGameData;

  const handleStatementChange = (index: number, value: string) => {
    const newStatements = [...localStatements];
    newStatements[index] = value;
    setLocalStatements(newStatements);
  };

  const handleSubmitStatements = () => {
    console.log("handleSubmitStatements called");
    if (localStatements.some(s => !s.trim()) || localTruthIndex === null) {
      alert("Please fill all statements and select the truth.");
      return;
    }
    // Call the prop passed from Games.tsx, which is onTruthLieSubmit
    onTruthLieSubmit(localStatements, localTruthIndex); 
    setLocalStatements(["", ""]);
    setLocalTruthIndex(null);
  };
  
  // Determine current player's role based on gameData from gameSession
  const currentPlayerIsMaker = gameData.playerMakingStatements === currentUser.uid;
  const currentPlayerIsGuesser = gameData.playerGuessing === currentUser.uid;
  const roundPhase = gameData.roundPhase;

  // Example: Submitting statements UI
  const renderSubmitStatementsUI = () => {
    // Show the form when it's the current user's turn to submit statements
    if ((currentPlayerIsMaker || gameSession.currentTurn === currentUser.uid) && 
        roundPhase === 'submitting') {
      return (
        <div className="my-4">
          <h3 className="font-semibold mb-2">Your turn to make statements (One truth, one lie):</h3>
          {localStatements.map((stmt, index) => (
            <div key={index} className="mb-2 flex items-center">
              <input
                type="text"
                placeholder={`Statement ${index + 1}`}
                value={stmt}
                onChange={(e) => handleStatementChange(index, e.target.value)}
                className="border p-2 rounded w-full mr-2"
              />
              <input
                type="radio"
                name="truthStatement"
                checked={localTruthIndex === index}
                onChange={() => setLocalTruthIndex(index)}
                className="form-radio h-5 w-5 text-blue-600"
              />
              <label className="ml-1">Is Truth</label>
            </div>
          ))}
          <button 
            onClick={handleSubmitStatements}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
          >
            Submit Statements
          </button>
        </div>
      );
    }
    return null;
  };

  // Example: Guessing UI
  const renderGuessingUI = () => {
    // Ensure submittedStatements are available and it's the guessing phase
    if (currentPlayerIsGuesser && roundPhase === 'guessing') {
      // Check if we have submitted statements to guess from
      if (!gameData.submittedStatements || !Array.isArray(gameData.submittedStatements) || gameData.submittedStatements.length === 0) {
        console.error("Missing submitted statements", gameData);
        return (
          <div className="my-4 p-4 bg-yellow-50 border border-yellow-300 rounded-md">
            <p className="text-yellow-800">Waiting for statements to be submitted...</p>
          </div>
        );
      }
      
      return (
        <div className="my-4">
          <h3 className="font-semibold mb-2">{opponent?.displayName || 'Opponent'} has made their statements. Guess the truth:</h3>
          {gameData.submittedStatements.map((stmt, index) => (
            <button
              key={index}
              onClick={() => {
                console.log("Guessing on statement", index, "for round", gameData.currentRound);
                onTruthLieGuess(gameData.currentRound, index);
              }}
              className="block w-full text-left p-2 my-1 border rounded hover:bg-gray-100"
            >
              {stmt.text}
            </button>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Example: Displaying round results or waiting message
  const renderRoundStatusUI = () => {
    const currentRoundData = gameData.rounds && gameData.rounds[gameData.currentRound];
    if (roundPhase === 'revealed' && currentRoundData) {
      const truthText = currentRoundData.statements.find(s => s.isTruth)?.text;
      
      return (
        <div className="my-4 p-3 bg-gray-100 rounded">
          <h3 className="font-semibold">Round {gameData.currentRound + 1} Result:</h3>
          <p>The truth was: "{truthText}"</p>
          {currentRoundData.guess !== undefined && (
            <p>
              {currentRoundData.guesser === currentUser.uid ? "You" : opponent?.displayName} guessed statement {currentRoundData.guess + 1}.
              This was {currentRoundData.isCorrect ? (
                <span className="text-green-600 font-bold">CORRECT! (+1 point)</span>
              ) : (
                <span className="text-red-600">INCORRECT.</span>
              )}
            </p>
          )}
          
          {/* Show whose turn it is next */}
          <p className="mt-3 text-blue-600 font-medium">
            {gameSession.currentTurn === currentUser.uid ? 
              "It's your turn to make statements now." : 
              `Waiting for ${opponent?.displayName || 'Opponent'} to make statements...`}
          </p>
        </div>
      );
    }
    if (roundPhase === 'submitting' && !currentPlayerIsMaker) {
        return <p className="my-4 text-gray-600">Waiting for {opponent?.displayName || 'Opponent'} to submit statements...</p>;
    }
    if (roundPhase === 'guessing' && !currentPlayerIsGuesser) {
        return <p className="my-4 text-gray-600">Waiting for {opponent?.displayName || 'Opponent'} to guess...</p>;
    }
    return null;
  };


  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h2 className="text-xl font-bold mb-4">Truth or Lie</h2>
      
      <div className="mb-4 flex justify-between items-center">
        <div>
            <h3 className="font-semibold">Scores:</h3>
            <p>You: {gameData.scores?.[currentUser.uid] || 0}</p>
            <p>{opponent?.displayName || 'Opponent'}: {gameData.scores?.[gameSession.player1 === currentUser.uid ? gameSession.player2 : gameSession.player1] || 0}</p>
        </div>
        <button 
            onClick={onAbandonGame}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded"
        >
            Abandon Game
        </button>
      </div>
      
      {/* Display current turn indicator */}
      <div className="mb-4 p-2 bg-blue-50 rounded border border-blue-100">
        <p className="text-blue-800">
          {gameSession.currentTurn === currentUser.uid ? (
            <span className="font-medium">Your turn {roundPhase === 'submitting' ? "to make statements" : roundPhase === 'guessing' ? "to guess" : ""}</span>
          ) : (
            <span>{opponent?.displayName || 'Opponent'}'s turn {roundPhase === 'submitting' ? "to make statements" : roundPhase === 'guessing' ? "to guess" : ""}</span>
          )}
        </p>
      </div>

      {/* Debug info - can be removed in production */}
      {/* <div className="mb-4 p-2 bg-gray-100 text-xs">
        <p>Game phase: {roundPhase}</p>
        <p>Current turn: {gameSession.currentTurn === currentUser.uid ? "You" : "Opponent"}</p>
        <p>Player making statements: {gameData.playerMakingStatements === currentUser.uid ? "You" : "Opponent"}</p>
        <p>Player guessing: {gameData.playerGuessing === currentUser.uid ? "You" : "Opponent"}</p>
      </div> */}

      {renderSubmitStatementsUI()}
      {renderGuessingUI()}
      {renderRoundStatusUI()}

      {/* Display previous rounds if any */}
      {gameData.rounds && gameData.rounds.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-2">Game History:</h3>
          {gameData.rounds.map((round, rIndex) => (
            <div key={rIndex} className="mb-3 p-3 border rounded bg-gray-50">
              <p className="font-medium">Round {rIndex + 1}:</p>
              <p>Statements by: {round.playerMakingStatements === currentUser.uid ? "You" : opponent?.displayName}</p>
              <ul className="list-disc list-inside ml-4">
                {round.statements.map((s, sIndex) => (
                  <li key={sIndex} className={s.isTruth && round.guess !== null ? 'font-bold text-green-600' : ''}>
                    {s.text} {s.isTruth && round.guess !== null ? "(Truth)" : ""}
                  </li>
                ))}
              </ul>
              {round.guess !== undefined && (
                <p className="mt-1">
                  Guess by {round.guesser === currentUser.uid ? "You" : opponent?.displayName}: Statement {round.guess + 1} - 
                  <span className={round.isCorrect ? 'text-green-600' : 'text-red-600'}>
                    {round.isCorrect ? " Correct" : " Incorrect"}
                  </span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      
      {gameSession.status === 'completed' && (
        <div className="mt-6 p-4 bg-blue-100 rounded text-center">
          <h3 className="text-xl font-bold">Game Over!</h3>
          {gameSession.winner === currentUser.uid && <p className="text-green-600 text-lg">You won!</p>}
          {gameSession.winner && gameSession.winner !== currentUser.uid && gameSession.winner !== 'draw' && <p className="text-red-600 text-lg">{opponent?.displayName || 'Opponent'} won!</p>}
          {gameSession.winner === 'draw' && <p className="text-gray-700 text-lg">It's a draw!</p>}
        </div>
      )}
    </div>
  );
};

export default TruthOrLieGame;
