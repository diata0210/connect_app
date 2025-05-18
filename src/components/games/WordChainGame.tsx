import React from 'react';
import { GameSession, User, WordChainGameData } from '../../pages/Games'; // Adjust path as needed

interface WordChainGameProps {
  gameSession: GameSession;
  currentUser: User;
  opponent: User | null; // Added opponent prop
  onWordSubmit: (word: string) => Promise<void>; // Renamed from onSubmit for clarity
  // Props passed from Games.tsx
  currentWord: string;
  setCurrentWord: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: () => Promise<void>; // This is the actual submit handler from Games.tsx
  onAbandonGame: () => Promise<void>;
}

const WordChainGame: React.FC<WordChainGameProps> = ({
  gameSession,
  currentUser,
  opponent, // Added opponent
  // onWordSubmit, // This was the internal handler, now using onSubmit from parent
  currentWord,    // State managed by parent (Games.tsx)
  setCurrentWord, // State setter managed by parent
  onSubmit,       // This is the function to call when submitting a word
  onAbandonGame,
}) => {
  // const [currentWord, setCurrentWord] = useState(''); // State now managed by parent
  const gameData = gameSession.gameData as WordChainGameData;

  const handleSubmit = () => {
    if (!currentWord.trim()) {
      alert("Please enter a word.");
      return;
    }
    onSubmit(); // Call the onSubmit passed from Games.tsx
    // setCurrentWord(''); // Parent will handle resetting if necessary after successful submit
  };

  const lastPlayedWord = gameData.words && gameData.words.length > 0 ? gameData.words[gameData.words.length - 1].word : null;
  const lastLetter = lastPlayedWord ? lastPlayedWord.slice(-1).toUpperCase() : null;


  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Word Chain</h2>
        <button 
            onClick={onAbandonGame}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded text-sm"
        >
            Abandon Game
        </button>
      </div>
      
      {/* Display Scores if available */}
      {gameData.scores && (
        <div className="mb-4">
          <h3 className="font-semibold">Scores:</h3>
          <p>You: {gameData.scores?.[currentUser.uid] || 0}</p>
          <p>{opponent?.displayName || 'Opponent'}: {gameData.scores?.[gameSession.player1 === currentUser.uid ? gameSession.player2 : gameSession.player1] || 0}</p>
        </div>
      )}

      <p className="mb-2">Current Turn: <span className="font-semibold">{gameSession.currentTurn === currentUser.uid ? "Your Turn" : (opponent?.displayName || "Opponent") + "'s Turn"}</span></p>
      {lastPlayedWord && (
        <p className="mb-2">Last word played: <span className="font-semibold">{lastPlayedWord}</span></p>
      )}
      {lastLetter && gameSession.currentTurn === currentUser.uid && (
        <p className="mb-4 text-blue-600">Your word must start with the letter: <span className="font-bold text-2xl">{lastLetter}</span></p>
      )}
      {gameData.errorMessage && (
        <p className="mb-4 text-red-500">{gameData.errorMessage}</p>
      )}

      {gameSession.currentTurn === currentUser.uid && gameSession.status === 'active' && (
        <div className="flex items-center mt-4">
          <input 
            type="text" 
            placeholder={lastLetter ? `Word starting with ${lastLetter}` : "Enter a word"}
            className="border p-2 rounded-l w-full"
            value={currentWord} // Use prop from parent
            onChange={(e) => setCurrentWord(e.target.value)} // Use prop from parent
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            disabled={gameSession.status !== 'active'}
          />
          <button 
            onClick={handleSubmit}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-r"
            disabled={gameSession.status !== 'active'}
          >
            Submit Word
          </button>
        </div>
      )}

      {/* Display list of used words */}
      {gameData.words && gameData.words.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-2">Words Played:</h3>
          <div className="max-h-60 overflow-y-auto bg-gray-50 p-3 rounded">
            {gameData.words.map((entry, index) => (
              <p key={index} className="text-sm">
                <span className="font-medium">{entry.player === currentUser.uid ? "You" : opponent?.displayName || "Opponent"}:</span> {entry.word}
              </p>
            ))}
          </div>
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
          <p className="text-gray-700 text-lg">This game session was abandoned.</p>
        </div>
      )}
    </div>
  );
};

export default WordChainGame;
