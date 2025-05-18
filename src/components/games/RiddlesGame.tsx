import React, { useState } from 'react';
import { GameSession, User, RiddlesGameData } from '../../pages/Games';

interface RiddlesGameProps {
  gameSession: GameSession;
  currentUser: User;
  opponent: User | null;
  answer: string;
  setAnswer: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: () => Promise<void>;
  onShowHint: () => void;
  showHint: boolean;
  onAbandonGame: () => Promise<void>;
  
  // Props for riddle game
  onCreateRiddle?: (riddle: {answer: string, hints: string[]}) => Promise<void>;
  onRequestHint?: () => Promise<void>;
}

const RiddlesGame: React.FC<RiddlesGameProps> = ({
  gameSession,
  currentUser,
  opponent,
  answer,
  setAnswer,
  onSubmit,
  onAbandonGame,
  onCreateRiddle,
  onRequestHint
}) => {
  const gameData = gameSession.gameData as RiddlesGameData;
  const [newRiddleAnswer, setNewRiddleAnswer] = useState('');
  const [hints, setHints] = useState<string[]>(['', '', '']);
  const [creatingRiddle, setCreatingRiddle] = useState(false);

  const handleSubmit = () => {
    if (!answer.trim()) {
      alert("Please enter your answer.");
      return;
    }
    onSubmit();
  };
  
  const handleCreateRiddle = () => {
    if (!newRiddleAnswer.trim()) {
      alert("Please enter an answer for your riddle.");
      return;
    }
    
    if (hints.some(hint => !hint.trim())) {
      alert("Please provide all three hints.");
      return;
    }
    
    if (onCreateRiddle) {
      onCreateRiddle({answer: newRiddleAnswer, hints: hints});
      setNewRiddleAnswer('');
      setHints(['', '', '']);
      setCreatingRiddle(false);
    }
  };
  
  const updateHint = (index: number, text: string) => {
    const newHints = [...hints];
    newHints[index] = text;
    setHints(newHints);
  };
  
  const currentRiddle = gameData.currentRiddle;
  const visibleHintCount = gameData.visibleHintCount || 1;
  const maxPoints = 3;
  const currentPoints = maxPoints - (visibleHintCount - 1);
  
  // Lấy số lần đã đoán và số lần đoán còn lại
  const guessAttempts = gameData.guessAttempts || 0;
  const remainingGuesses = 5 - guessAttempts;
  
  // Người tạo câu đố
  const shouldCreateRiddle = (
    (gameSession.currentTurn === currentUser.uid && !currentRiddle && !gameData.riddleRevealed) || 
    creatingRiddle
  );
  
  // Người đoán câu đố
  const isGuesser = (
    currentRiddle && 
    currentRiddle.createdBy !== currentUser.uid &&
    gameSession.currentTurn === currentUser.uid
  );

  // Kiểm tra xem đã hết lượt đoán chưa
  const isOutOfGuesses = gameData.guessAttempts >= 5;

  // Kiểm tra xem có phải là người ra câu đố và đến lượt họ tạo câu đố mới không
  const shouldPromptNewRiddle = 
    gameData.riddleRevealed && 
    gameSession.currentTurn === currentUser.uid && 
    !currentRiddle;

  // Tạo riddle mới
  if (shouldCreateRiddle) {
    return (
      <div className="p-4 bg-white shadow rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Riddles & Puzzles</h2>
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
        
        <div className="my-4 p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-semibold text-lg mb-2">Your turn to create a riddle!</h3>
          <p className="mb-4 text-sm text-gray-600">
            Create a challenging riddle for your opponent. The opponent will have 5 attempts to guess.
            They can use hints to help, but will earn you more points if they fail with more hints used.
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Answer:</label>
            <input 
              type="text" 
              value={newRiddleAnswer} 
              onChange={(e) => setNewRiddleAnswer(e.target.value)}
              className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
              placeholder="Enter your riddle answer"
            />
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Hint (Hardest - 3 points):
              </label>
              <textarea
                value={hints[0]}
                onChange={(e) => updateHint(0, e.target.value)}
                className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                placeholder="Provide a challenging first hint"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Second Hint (Medium - 2 points):
              </label>
              <textarea
                value={hints[1]}
                onChange={(e) => updateHint(1, e.target.value)}
                className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                placeholder="Provide a medium difficulty hint"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Third Hint (Easiest - 1 point):
              </label>
              <textarea
                value={hints[2]
                }
                onChange={(e) => updateHint(2, e.target.value)}
                className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                placeholder="Provide an easy hint"
                rows={2}
              />
            </div>
          </div>
          
          <button
            onClick={handleCreateRiddle}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded w-full"
          >
            Submit Riddle
          </button>
        </div>
      </div>
    );
  }

  // UI cho người đoán hoặc đang xem (người tạo câu đố)
  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Riddles & Puzzles</h2>
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

      {/* Hiển thị nút tạo câu đố mới cho người ra câu đố khi đến lượt họ */}
      {shouldPromptNewRiddle && (
        <div className="my-4 p-4 bg-blue-100 rounded-lg text-center">
          <p className="font-semibold text-blue-800 mb-3">It's your turn to create a new riddle!</p>
          <button
            onClick={() => setCreatingRiddle(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Create New Riddle
          </button>
        </div>
      )}

      {/* Hiển thị trạng thái hiện tại của trò chơi */}
      {currentRiddle && (
        <div className="my-4 p-4 bg-yellow-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">
              {currentRiddle.createdBy === currentUser.uid 
                ? "Your riddle for " + (opponent?.displayName || "Opponent")
                : "Riddle from " + (opponent?.displayName || "Opponent")}
            </h3>
            
            {/* Hiển thị số lần đoán còn lại */}
            {isGuesser && !gameData.riddleRevealed && (
              <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {remainingGuesses} {remainingGuesses === 1 ? 'guess' : 'guesses'} remaining
              </div>
            )}
            
            {/* Hiển thị điểm tiềm năng nếu đoán đúng */}
            {isGuesser && !gameData.riddleRevealed && (
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Worth {currentPoints} {currentPoints === 1 ? 'point' : 'points'}
              </div>
            )}
          </div>
          
          <div className="space-y-2 mb-4">
            {currentRiddle.hints.slice(0, visibleHintCount).map((hint, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg shadow-sm">
                <span className="text-gray-500 text-xs">Hint {idx + 1}:</span>
                <p className="font-medium">{hint}</p>
              </div>
            ))}
          </div>
          
          {/* Hiển thị lịch sử các lần đoán */}
          {gameData.guessHistory && gameData.guessHistory.length > 0 && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Previous guesses:</h4>
              <div className="space-y-1">
                {gameData.guessHistory.map((guess, idx) => (
                  <div key={idx} className="flex items-center">
                    <span className="w-5 h-5 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs mr-2">
                      {idx + 1}
                    </span>
                    <p className="text-gray-700">{guess}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Hiển thị nút yêu cầu gợi ý cho người đoán, nếu còn gợi ý khả dụng */}
          {isGuesser && !gameData.riddleRevealed && !isOutOfGuesses && visibleHintCount < 3 && onRequestHint && (
            <button
              onClick={onRequestHint}
              className="mb-4 w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded"
            >
              Get Next Hint (-1 point)
            </button>
          )}
          
          {/* Hiển thị form đoán cho người đoán nếu còn lượt đoán */}
          {isGuesser && !gameData.riddleRevealed && !isOutOfGuesses && (
            <div className="flex items-center mt-4">
              <input 
                type="text" 
                placeholder="Your answer" 
                className="flex-1 border p-2 rounded-l"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <button 
                onClick={handleSubmit}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-r"
              >
                Submit Answer
              </button>
            </div>
          )}
          
          {/* Hiển thị thông báo hết lượt đoán */}
          {isGuesser && !gameData.riddleRevealed && isOutOfGuesses && (
            <div className="p-3 bg-orange-100 text-orange-700 rounded-lg text-center">
              You've used all 5 guesses. Waiting for result...
            </div>
          )}
          
          {/* Hiển thị thông báo chờ đợi cho người tạo câu đố */}
          {currentRiddle.createdBy === currentUser.uid && !gameData.riddleRevealed && (
            <div className="p-3 bg-blue-50 rounded-lg text-blue-700 text-center">
              Waiting for {opponent?.displayName || 'Opponent'} to guess your riddle...
              {gameData.guessAttempts > 0 && (
                <p className="text-sm mt-1">
                  They have used {gameData.guessAttempts}/5 guesses and {visibleHintCount - 1} hints.
                </p>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Hiển thị kết quả sau khi câu trả lời được đưa ra hoặc hết lượt đoán */}
      {gameData.riddleRevealed && currentRiddle && (
        <div className="my-4 p-3 bg-green-50 rounded">
          <p className="font-semibold">The answer was:</p>
          <p className="text-lg font-bold">{currentRiddle.answer}</p>
          
          {gameData.lastGuess && (
            <div className={`mt-2 p-2 ${gameData.lastGuess.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} rounded`}>
              {gameData.lastGuess.isCorrect ? (
                <>
                  <p>
                    {gameData.lastGuess.playerId === currentUser.uid ? "You" : opponent?.displayName} guessed correctly and earned {gameData.lastGuess.pointsEarned} {gameData.lastGuess.pointsEarned === 1 ? 'point' : 'points'}.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    {gameData.lastGuess.playerId === currentUser.uid ? "You" : opponent?.displayName} used all 5 guesses and couldn't find the answer.
                  </p>
                  {gameData.lastGuess.creatorPoints > 0 && (
                    <p className="mt-1">
                      {currentRiddle.createdBy === currentUser.uid ? "You" : opponent?.displayName} earned {gameData.lastGuess.creatorPoints} {gameData.lastGuess.creatorPoints === 1 ? 'point' : 'points'} for creating a challenging riddle!
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* Nếu đã có kết quả và đến lượt của người chơi hiện tại, hiển thị thông báo */}
          {gameData.riddleRevealed && gameSession.currentTurn === currentUser.uid && !currentRiddle && (
            <div className="mt-4 p-3 bg-blue-100 rounded text-center">
              <p className="text-blue-700">It's your turn to create a new riddle!</p>
              <button
                onClick={() => setCreatingRiddle(true)}
                className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
              >
                Create New Riddle
              </button>
            </div>
          )}
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

      {/* Display history of solved riddles */}
      {gameData.pastRiddles && gameData.pastRiddles.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-2">Previous Riddles:</h3>
          <div className="max-h-60 overflow-y-auto bg-gray-50 p-3 rounded">
            {gameData.pastRiddles.map((riddle, index) => (
              <div key={index} className="p-3 mb-2 border rounded bg-white">
                <p className="font-medium">Riddle by: {riddle.createdBy === currentUser.uid ? "You" : opponent?.displayName}</p>
                <p className="text-sm italic mt-1">Answer: {riddle.answer}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {riddle.guessedBy ? (
                    `${riddle.guessedBy === currentUser.uid ? "You" : opponent?.displayName} ${
                      riddle.guessCorrect 
                        ? `guessed correctly (+${riddle.pointsEarned} pts)` 
                        : `couldn't guess correctly (${riddle.hintsUsed || 0} hints used, ${riddle.attempts || 5}/5 attempts)`
                    }`
                  ) : "Not guessed"}
                </p>
                {!riddle.guessCorrect && riddle?.creatorPoints as any > 0 && (
                  <p className="text-xs text-green-600">
                    Creator earned {riddle.creatorPoints} {riddle.creatorPoints === 1 ? 'point' : 'points'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RiddlesGame;
