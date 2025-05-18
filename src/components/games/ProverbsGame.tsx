import React from 'react';
import { GameSession, User, ProverbsGameData } from '../../pages/Games'; // Adjust path as needed

interface ProverbsGameProps {
  gameSession: GameSession;
  currentUser: User;
  opponent: User | null; // Added opponent prop
  // onProverbSubmit: (answer: string) => Promise<void>; // Renamed to onSubmit for consistency
  // Props passed from Games.tsx
  answer: string;
  setAnswer: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: () => Promise<void>; // This is the actual submit handler from Games.tsx
  onShowHint: () => void;
  showHint: boolean;
  onAbandonGame: () => Promise<void>;
}

const ProverbsGame: React.FC<ProverbsGameProps> = ({
  gameSession,
  currentUser,
  opponent, // Added opponent
  // onProverbSubmit, // Using onSubmit from parent
  answer,         // State managed by parent
  setAnswer,      // State setter managed by parent
  onSubmit,       // Submit handler from parent
  onShowHint,
  showHint,
  onAbandonGame,
}) => {
  // const [answer, setAnswer] = useState(''); // State now managed by parent
  const gameData = gameSession.gameData as ProverbsGameData;

  const handleSubmit = () => {
    if (!answer.trim()) {
      alert("Please enter your answer.");
      return;
    }
    onSubmit(); // Call the onSubmit passed from Games.tsx
    // setAnswer(''); // Parent will handle resetting
  };

  const currentProverbDetail = gameData.currentProverbIndex !== null && gameData.proverbsList?.[gameData.currentProverbIndex];

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Proverbs Game</h2>
        <button 
            onClick={onAbandonGame}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded text-sm"
        >
            Abandon Game
        </button>
      </div>
      
      <div className="mb-4">
        <h3 className="font-semibold">Scores:</h3>
        <p>You: {gameData.score?.[currentUser.uid] || 0}</p>
        <p>{opponent?.displayName || 'Opponent'}: {gameData.score?.[gameSession.player1 === currentUser.uid ? gameSession.player2 : gameSession.player1] || 0}</p>
      </div>

      <p className="mb-2">Current Turn: <span className="font-semibold">{gameSession.currentTurn === currentUser.uid ? "Your Turn" : (opponent?.displayName || "Opponent") + "'s Turn"}</span></p>
      
      {currentProverbDetail && gameSession.status === 'active' && (
        <div className="my-4 p-3 bg-blue-50 rounded">
          <p className="font-semibold">Complete the proverb:</p>
          <p className="text-lg my-2">"{currentProverbDetail.start} ..."</p>
          {currentProverbDetail.hint && showHint && (
            <p className="text-sm text-gray-600 italic">Hint: {currentProverbDetail.hint}</p>
          )}
          {currentProverbDetail.hint && !showHint && gameSession.currentTurn === currentUser.uid && (
            <button 
              onClick={onShowHint} 
              className="text-xs text-blue-500 hover:underline"
            >
              Show Hint
            </button>
          )}
        </div>
      )}
      
      {gameData.proverbRevealed && currentProverbDetail && (
         <div className="my-4 p-3 bg-green-50 rounded">
            <p className="font-semibold">The full proverb was:</p>
            <p className="text-lg">"{currentProverbDetail.start} <span className="font-bold">{currentProverbDetail.end}</span>"</p>
         </div>
      )}


      {gameSession.currentTurn === currentUser.uid && gameSession.status === 'active' && currentProverbDetail && !gameData.proverbRevealed && (
        <div className="flex items-center mt-4">
          <input 
            type="text" 
            placeholder="Your answer for the proverb" 
            className="border p-2 rounded-l w-full"
            value={answer} // Use prop from parent
            onChange={(e) => setAnswer(e.target.value)} // Use prop from parent
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            disabled={gameSession.status !== 'active'}
          />
          <button 
            onClick={handleSubmit}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-r"
            disabled={gameSession.status !== 'active'}
          >
            Submit Answer
          </button>
        </div>
      )}
      
      {!currentProverbDetail && gameSession.currentTurn === currentUser.uid && gameSession.status === 'active' && (
        <div className="my-4 text-center">
            <p className="text-gray-600 mb-2">It's your turn to start the next proverb.</p>
            {/* The game logic in Games.tsx should handle starting the next proverb automatically or via a button here */}
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
       {gameSession.status === 'abandoned' && (
        <div className="mt-6 p-4 bg-yellow-100 rounded text-center">
          <h3 className="text-xl font-bold">Game Abandoned</h3>
        </div>
      )}

      {/* Display history of completed proverbs */}
      {gameData.proverbsList && gameData.proverbsList.filter(p => p.completedBy).length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-2">Completed Proverbs:</h3>
          <div className="max-h-60 overflow-y-auto bg-gray-50 p-3 rounded">
            {gameData.proverbsList.map((proverb, index) => {
              if (!proverb.completedBy) return null;
              const completerName = proverb.completedBy === currentUser.uid ? "You" : opponent?.displayName || "Opponent";
              return (
                <div key={index} className={`p-2 my-1 border-l-4 ${proverb.isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                  <p className="text-sm">"{proverb.start} <span className="font-bold">{proverb.revealedEnd || '...'}</span>"</p>
                  <p className="text-xs">
                    Completed by: {completerName} - {proverb.isCorrect ? "Correct" : "Incorrect"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProverbsGame;
