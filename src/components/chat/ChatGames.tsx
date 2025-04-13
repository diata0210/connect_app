import React, { useState, useEffect } from 'react';

interface User {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

// Updated interface to match the props from Chat.tsx
interface GameProps {
  gameType: 'tictactoe' | 'connect4' | 'wordgame';
  onEndGame: () => void; // This matches the prop passed from Chat.tsx
  currentUser: User;
  otherUser: User;
  chatId: string;
}

export interface GameResult {
  winner: string | null; // userId of winner or null for draw
  gameType: 'tictactoe' | 'connect4' | 'wordgame';
  score: {
    [userId: string]: number;
  };
}

// Tic Tac Toe Game Component
const TicTacToe: React.FC<{
  onGameEnd: (result: GameResult) => void;
  currentUserId: string;
  otherUserId: string;
}> = ({ onGameEnd, currentUserId, otherUserId }) => {
  const [board, setBoard] = useState<Array<string | null>>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [status, setStatus] = useState('');

  const currentPlayerMark = currentUserId === otherUserId ? 'O' : 'X';
  const otherPlayerMark = currentUserId === otherUserId ? 'X' : 'O';
  
  const calculateWinner = (squares: Array<string | null>) => {
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
    
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    
    return null;
  };

  useEffect(() => {
    const winner = calculateWinner(board);
    
    if (winner) {
      setStatus(`Winner: ${winner === 'X' ? 'Player X' : 'Player O'}`);
      
      // Determine the actual winner based on the mark
      const actualWinner = winner === currentPlayerMark ? currentUserId : otherUserId;
      
      onGameEnd({
        winner: actualWinner,
        gameType: 'tictactoe',
        score: {
          [currentUserId]: winner === currentPlayerMark ? 1 : 0,
          [otherUserId]: winner === otherPlayerMark ? 1 : 0
        }
      });
    } else if (board.every(square => square !== null)) {
      setStatus('Draw!');
      onGameEnd({
        winner: null,
        gameType: 'tictactoe',
        score: {
          [currentUserId]: 0.5,
          [otherUserId]: 0.5
        }
      });
    } else {
      setStatus(`Next player: ${isXNext ? 'X' : 'O'}`);
    }
  }, [board, isXNext, currentPlayerMark, otherPlayerMark, currentUserId, otherUserId, onGameEnd]);

  const handleClick = (i: number) => {
    if (calculateWinner(board) || board[i] || 
        (isXNext && currentPlayerMark !== 'X') || 
        (!isXNext && currentPlayerMark !== 'O')) {
      return;
    }
    
    const newBoard = board.slice();
    newBoard[i] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);
  };

  const renderSquare = (i: number) => {
    return (
      <button 
        className={`w-16 h-16 border border-gray-300 flex items-center justify-center text-2xl font-bold ${
          board[i] === 'X' ? 'text-blue-600' : board[i] === 'O' ? 'text-red-600' : ''
        }`}
        onClick={() => handleClick(i)}
      >
        {board[i]}
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center mt-2 mb-4">
      <h3 className="text-lg font-medium mb-2">Tic Tac Toe</h3>
      <div className="status mb-2 text-indigo-700 font-medium">{status}</div>
      <div className="board">
        <div className="grid grid-cols-3">
          {renderSquare(0)}
          {renderSquare(1)}
          {renderSquare(2)}
        </div>
        <div className="grid grid-cols-3">
          {renderSquare(3)}
          {renderSquare(4)}
          {renderSquare(5)}
        </div>
        <div className="grid grid-cols-3">
          {renderSquare(6)}
          {renderSquare(7)}
          {renderSquare(8)}
        </div>
      </div>
      <div className="mt-2 text-sm text-gray-500">
        You are player <span className="font-medium">{currentPlayerMark}</span>
      </div>
    </div>
  );
};

// Connect Four Game Component
const ConnectFour: React.FC<{
  onGameEnd: (result: GameResult) => void;
  currentUserId: string;
  otherUserId: string;
}> = ({ onGameEnd, currentUserId, otherUserId }) => {
  const rows = 6;
  const cols = 7;
  const [board, setBoard] = useState<Array<Array<number>>>(
    Array(rows).fill(null).map(() => Array(cols).fill(0))
  );
  const [isPlayer1Turn, setIsPlayer1Turn] = useState(true);
  const [status, setStatus] = useState('');

  const currentPlayerNumber = currentUserId === otherUserId ? 2 : 1;

  const checkWinner = (board: number[][]) => {
    // Check horizontal
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 3; c++) {
        if (board[r][c] !== 0 && 
            board[r][c] === board[r][c+1] && 
            board[r][c] === board[r][c+2] && 
            board[r][c] === board[r][c+3]) {
          return board[r][c];
        }
      }
    }

    // Check vertical
    for (let r = 0; r < rows - 3; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c] !== 0 && 
            board[r][c] === board[r+1][c] && 
            board[r][c] === board[r+2][c] && 
            board[r][c] === board[r+3][c]) {
          return board[r][c];
        }
      }
    }

    // Check diagonal (positive slope)
    for (let r = 3; r < rows; r++) {
      for (let c = 0; c < cols - 3; c++) {
        if (board[r][c] !== 0 && 
            board[r][c] === board[r-1][c+1] && 
            board[r][c] === board[r-2][c+2] && 
            board[r][c] === board[r-3][c+3]) {
          return board[r][c];
        }
      }
    }

    // Check diagonal (negative slope)
    for (let r = 0; r < rows - 3; r++) {
      for (let c = 0; c < cols - 3; c++) {
        if (board[r][c] !== 0 && 
            board[r][c] === board[r+1][c+1] && 
            board[r][c] === board[r+2][c+2] && 
            board[r][c] === board[r+3][c+3]) {
          return board[r][c];
        }
      }
    }

    // Check if board is full (draw)
    if (board.every(row => row.every(cell => cell !== 0))) {
      return 0;
    }

    return null;
  };

  useEffect(() => {
    const winner = checkWinner(board);
    
    if (winner === 1 || winner === 2) {
      setStatus(`Winner: Player ${winner}`);
      
      // Determine the actual winner based on the player number
      const actualWinner = winner === currentPlayerNumber ? currentUserId : otherUserId;
      
      onGameEnd({
        winner: actualWinner,
        gameType: 'connect4',
        score: {
          [currentUserId]: winner === currentPlayerNumber ? 1 : 0,
          [otherUserId]: winner !== currentPlayerNumber ? 1 : 0
        }
      });
    } else if (winner === 0) {
      setStatus('Draw!');
      onGameEnd({
        winner: null,
        gameType: 'connect4',
        score: {
          [currentUserId]: 0.5,
          [otherUserId]: 0.5
        }
      });
    } else {
      setStatus(`Player ${isPlayer1Turn ? '1' : '2'}'s turn`);
    }
  }, [board, isPlayer1Turn, currentPlayerNumber, currentUserId, otherUserId, onGameEnd]);

  const dropPiece = (col: number) => {
    if (checkWinner(board) || 
        (isPlayer1Turn && currentPlayerNumber !== 1) || 
        (!isPlayer1Turn && currentPlayerNumber !== 2)) {
      return;
    }
    
    const newBoard = [...board.map(row => [...row])];
    
    // Find the lowest empty row in the selected column
    for (let r = rows - 1; r >= 0; r--) {
      if (newBoard[r][col] === 0) {
        newBoard[r][col] = isPlayer1Turn ? 1 : 2;
        setBoard(newBoard);
        setIsPlayer1Turn(!isPlayer1Turn);
        return;
      }
    }
  };

  return (
    <div className="flex flex-col items-center mt-2 mb-4">
      <h3 className="text-lg font-medium mb-2">Connect Four</h3>
      <div className="status mb-2 text-indigo-700 font-medium">{status}</div>
      <div className="board bg-blue-100 p-2 rounded">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {row.map((cell, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                className="w-8 h-8 m-1 rounded-full flex items-center justify-center"
                onClick={() => dropPiece(colIndex)}
                style={{
                  backgroundColor: 
                    cell === 1 ? '#ef4444' : 
                    cell === 2 ? '#3b82f6' : 
                    'white'
                }}
              ></button>
            ))}
          </div>
        ))}
        {/* Column selectors */}
        <div className="flex mt-1">
          {Array(cols).fill(null).map((_, colIndex) => (
            <button
              key={`selector-${colIndex}`}
              className="w-8 h-4 m-1 flex items-center justify-center text-xs bg-gray-200 hover:bg-gray-300 rounded"
              onClick={() => dropPiece(colIndex)}
            >
              ↓
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 text-sm text-gray-500">
        You are player <span className="font-medium">{currentPlayerNumber}</span> ({currentPlayerNumber === 1 ? 'Red' : 'Blue'})
      </div>
    </div>
  );
};

// Word Game Component
const WordGame: React.FC<{
  onGameEnd: (result: GameResult) => void;
  currentUserId: string;
  otherUserId: string;
}> = ({ onGameEnd, currentUserId, otherUserId }) => {
  const [word, setWord] = useState('');
  const [guessedWord, setGuessedWord] = useState('');
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [isGameCreator, setIsGameCreator] = useState(currentUserId !== otherUserId);
  const [status, setStatus] = useState('');
  const [showWordInput, setShowWordInput] = useState(isGameCreator);
  const maxAttempts = 8;
  
  const submitWord = () => {
    if (word.trim().length < 3) {
      setStatus('Word must be at least 3 characters long');
      return;
    }
    
    setGuessedWord('_'.repeat(word.length));
    setShowWordInput(false);
    setStatus('Game started! Your opponent is guessing.');
  };
  
  const guessLetter = (letter: string) => {
    if (guessedLetters.includes(letter) || attempts >= maxAttempts) return;
    
    const normalizedWord = word.toLowerCase();
    const newGuessedLetters = [...guessedLetters, letter];
    setGuessedLetters(newGuessedLetters);
    
    if (!normalizedWord.includes(letter)) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= maxAttempts) {
        setStatus('Game over! You ran out of attempts.');
        onGameEnd({
          winner: currentUserId === otherUserId ? otherUserId : currentUserId,
          gameType: 'wordgame',
          score: {
            [currentUserId]: isGameCreator ? 1 : 0,
            [otherUserId]: isGameCreator ? 0 : 1
          }
        });
      }
    } else {
      // Update guessed word display
      let newGuessedWord = '';
      for (let i = 0; i < normalizedWord.length; i++) {
        if (newGuessedLetters.includes(normalizedWord[i])) {
          newGuessedWord += normalizedWord[i];
        } else {
          newGuessedWord += '_';
        }
      }
      setGuessedWord(newGuessedWord);
      
      // Check if word is complete
      if (!newGuessedWord.includes('_')) {
        setStatus('Congratulations! You guessed the word!');
        onGameEnd({
          winner: currentUserId !== otherUserId ? otherUserId : currentUserId,
          gameType: 'wordgame',
          score: {
            [currentUserId]: isGameCreator ? 0 : 1,
            [otherUserId]: isGameCreator ? 1 : 0
          }
        });
      }
    }
  };
  
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
  
  return (
    <div className="flex flex-col items-center mt-2 mb-4">
      <h3 className="text-lg font-medium mb-2">Hangman Word Game</h3>
      <div className="status mb-2 text-indigo-700 font-medium">{status}</div>
      
      {showWordInput ? (
        <div className="flex flex-col items-center">
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value.toLowerCase())}
            placeholder="Enter a word for your opponent to guess"
            className="px-3 py-2 border border-gray-300 rounded mb-2"
          />
          <button 
            onClick={submitWord}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Start Game
          </button>
        </div>
      ) : (
        <>
          {isGameCreator ? (
            <div className="mb-4">
              <p className="text-center">Your opponent is guessing the word:</p>
              <p className="text-2xl font-mono tracking-widest text-center mt-2 font-bold text-indigo-700">{word}</p>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-center">Guess the word:</p>
              <p className="text-2xl font-mono tracking-widest text-center mt-2 font-bold">
                {guessedWord.split('').map((char, i) => (
                  <span key={i} className="mx-1">{char}</span>
                ))}
              </p>
            </div>
          )}
          
          <div className="mb-2">
            <p>Attempts remaining: {maxAttempts - attempts} of {maxAttempts}</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full" 
                style={{ width: `${((maxAttempts - attempts) / maxAttempts) * 100}%` }}
              ></div>
            </div>
          </div>
          
          {!isGameCreator && (
            <div className="grid grid-cols-7 gap-1 mt-2">
              {alphabet.map((letter) => (
                <button
                  key={letter}
                  onClick={() => guessLetter(letter)}
                  disabled={guessedLetters.includes(letter) || attempts >= maxAttempts || !guessedWord.includes('_')}
                  className={`w-8 h-8 font-medium rounded flex items-center justify-center
                    ${guessedLetters.includes(letter) 
                      ? word.includes(letter) 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-red-100 text-red-700 border border-red-200' 
                      : 'bg-white border border-gray-300 hover:bg-gray-100'}
                  `}
                >
                  {letter}
                </button>
              ))}
            </div>
          )}
          
          <div className="mt-3 text-sm text-gray-500">
            {isGameCreator 
              ? "You created the game. Wait for your opponent to guess!" 
              : "Guess the letters to reveal the word!"}
          </div>
        </>
      )}
    </div>
  );
};

const ChatGames: React.FC<GameProps> = ({ 
  gameType, 
  onEndGame, 
  currentUser, 
  otherUser, 
  chatId 
}) => {
  // Function to handle game results
  const handleGameResult = (result: GameResult) => {
    console.log("Game result:", result);
    // Here you could save the game results to your database
    
    // End the game and return to chat
    onEndGame();
  };

  return (
    <div className="bg-white shadow-lg rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-indigo-700">
          Playing {gameType === 'tictactoe' ? 'Tic Tac Toe' : gameType === 'connect4' ? 'Connect Four' : 'Word Game'}
        </h2>
        <button 
          onClick={onEndGame}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {gameType === 'tictactoe' && (
        <TicTacToe 
          onGameEnd={handleGameResult}
          currentUserId={currentUser.uid}
          otherUserId={otherUser.uid}
        />
      )}
      
      {gameType === 'connect4' && (
        <ConnectFour 
          onGameEnd={handleGameResult}
          currentUserId={currentUser.uid}
          otherUserId={otherUser.uid}
        />
      )}
      
      {gameType === 'wordgame' && (
        <WordGame 
          onGameEnd={handleGameResult}
          currentUserId={currentUser.uid}
          otherUserId={otherUser.uid}
        />
      )}
    </div>
  );
};

export default ChatGames;