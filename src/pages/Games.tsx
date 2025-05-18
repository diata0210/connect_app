import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  orderBy,
  arrayUnion
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import TruthOrLieGame from '../components/games/TruthOrLieGame';
import RiddlesGame from '../components/games/RiddlesGame';

// Define interfaces (ensure these are comprehensive and exported if used elsewhere
export interface User {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

export interface Message {
  id?: string;
  gameSessionId: string;
  senderId: string;
  text: string;
  timestamp: any;
  type?: 'chat' | 'system' | 'game'; // Added 'game' type
}

export interface TruthLieRound {
  playerMakingStatements: string;
  statements: { text: string; isTruth: boolean }[];
  guesser: string;
  guess?: number; // Index of the guessed statement
  isCorrect?: boolean;
}

// Define specific data structures for each game type
export interface TruthOrLieGameData {
  rounds: TruthLieRound[];
  currentRound: number;
  maxRounds: number;
  scores: { [playerId: string]: number };
  playerMakingStatements?: string;
  playerGuessing?: string;
  submittedStatements?: { text: string; isTruth: boolean }[];
  truthIndex?: number;
  guessMade?: number;
  roundPhase?: 'submitting' | 'guessing' | 'revealed';
}

export interface WordChainGameData {
  words: Array<{ word: string; player: string }>; // Modified to track player
  lastWord: string | null;
  usedWords: string[];
  currentPlayerInput?: string;
  errorMessage?: string;
  scores?: { [playerId: string]: number }; // Added scores
}

export interface ProverbsGameData {
  // The actual proverbs for the session might be populated from PROVERBS constant or dynamically
  proverbsList: Array<{ start: string; end: string; hint?: string; completedBy?: string; isCorrect?: boolean; revealedEnd?: string }>;
  currentProverbIndex: number | null;
  score: { [playerId: string]: number };
  currentAttempt?: string;
  proverbRevealed?: boolean;
}

export interface RiddlesGameData {
  // Thay đổi cấu trúc cho trò chơi riddle
  currentRiddle: {
    answer: string;
    hints: string[];
    createdBy: string;
  } | null;
  visibleHintCount: number; // Số lượng hints hiện đang hiển thị (1-3)
  score: { [playerId: string]: number };
  guessAttempts: number; // Số lần đã đoán trong vòng hiện tại
  guessHistory: string[]; // Lịch sử các lần đoán trong vòng hiện tại
  lastGuess?: {
    guess: string;
    playerId: string;
    isCorrect: boolean;
    pointsEarned: number;
    creatorPoints: number; // Điểm người tạo câu đố nhận được nếu người đoán sai
    hintsUsed: number; // Số gợi ý đã sử dụng
  };
  riddleRevealed?: boolean;
  pastRiddles: Array<{
    answer: string;
    hints: string[];
    createdBy: string;
    guessedBy?: string;
    guessCorrect?: boolean;
    pointsEarned?: number;
    creatorPoints?: number; // Điểm người tạo câu đố nhận được
    hintsUsed?: number; // Số gợi ý đã sử dụng
    attempts?: number; // Số lần đoán đã sử dụng
  }>;
}

export interface GameSession {
  id: string;
  gameType: 'truth-or-lie' | 'word-chain' | 'proverbs' | 'riddles';
  player1: string;
  player2: string;
  chatId: string;
  status: 'active' | 'completed' | 'abandoned';
  currentTurn: string;
  createdAt: any; // Firestore Timestamp
  lastMoveAt: any; // Firestore Timestamp
  winner?: string;
  gameData: TruthOrLieGameData | WordChainGameData | ProverbsGameData | RiddlesGameData | any; // Using 'any' as a fallback for flexibility during development
}

const Games: React.FC = () => {
  const { sessionId: sessionIdFromRoute, gameType: gameTypeFromRoute } = useParams<{ sessionId?: string, gameType?: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [opponent, setOpponent] = useState<User | null>(null);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [gameMessage, setGameMessage] = useState(''); // Commented out
  const [gameMessages, setGameMessages] = useState<Message[]>([]);
  // const [gameResult, setGameResult] = useState<'win' | 'loss' | 'draw' | null>(null); // Commented out
  const [joinedGame, setJoinedGame] = useState(false);

  // Game-specific states
  //@ts-expect-error
  const [truthLieStatements, setTruthLieStatements] = useState<string[]>(["", ""]); // Changed to two statements
    //@ts-expect-error
  const [truthLieTruthIndex, setTruthLieTruthIndex] = useState<number | null>(null);

  const [riddleAnswer, setRiddleAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // const knownGameTypes = ["truth-or-lie", "word-chain", "proverbs-game", "riddles-game"];
  // Corrected knownGameTypes to match GameSession gameType
  const knownGameTypes = ["truth-or-lie", "word-chain", "proverbs", "riddles"];


  let effectiveSessionId: string | undefined = sessionIdFromRoute;
  let displayGameTypeInfo: string | undefined = undefined;

  if (!sessionIdFromRoute && gameTypeFromRoute) {
    if (knownGameTypes.includes(gameTypeFromRoute.toLowerCase())) {
      displayGameTypeInfo = gameTypeFromRoute;
      // Not a session, so ensure effectiveSessionId remains undefined
      effectiveSessionId = undefined; 
    } else {
      // Assume it's a session ID passed via the /games/:gameType route
      effectiveSessionId = gameTypeFromRoute;
    }
  }

  // Authentication listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName || 'User',
          email: user.email || '',
          photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`
        });
      } else {
        setCurrentUser(null);
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Load game session data
  useEffect(() => {
    if (!effectiveSessionId || !currentUser) {
      setGameSession(null); // Clear previous game session if any
      if (!displayGameTypeInfo) { // Only stop loading if not expecting to show game info or session
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      doc(db, 'gameSessions', effectiveSessionId),
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Set game session data
          const gameData: GameSession = {
            id: docSnap.id,
            gameType: data.gameType,
            player1: data.player1,
            player2: data.player2,
            chatId: data.chatId,
            status: data.status,
            currentTurn: data.currentTurn,
            winner: data.winner,
            gameData: data.gameData || {}, // Initialize gameData if not present
            createdAt: data.createdAt,
            lastMoveAt: data.lastMoveAt
          };
          
          setGameSession(gameData);
          
          // Check if the current user is a player in this game
          const isPlayer = data.player1 === currentUser.uid || data.player2 === currentUser.uid;
          if (!isPlayer) {
            setError("You are not authorized to join this game");
            setLoading(false);
            return;
          }
          
          // Mark that this user has joined the game
          if (!joinedGame) {
            setJoinedGame(true);
            
            // Add notification to the game chat that this player has joined
            await addDoc(collection(db, 'gameMessages'), {
              gameSessionId: effectiveSessionId,
              senderId: currentUser.uid,
              text: `${currentUser.displayName} joined the game`,
              timestamp: serverTimestamp(),
              type: 'system'
            });
          }
          
          // Determine opponent
          const opponentId = data.player1 === currentUser.uid ? data.player2 : data.player1;
          
          // Fetch opponent data
          try {
            const opponentDoc = await getDoc(doc(db, 'users', opponentId));
            if (opponentDoc.exists()) {
              const opponentData = opponentDoc.data();
              setOpponent({
                uid: opponentId,
                displayName: opponentData.displayName || 'Opponent',
                photoURL: opponentData.photoURL || `https://ui-avatars.com/api/?name=Opponent&background=random`
              });
            }
          } catch (err) {
            console.error('Error fetching opponent data:', err);
          }
          
          setLoading(false);
          
          // Check if game is finished and calculate result
          if (data.status === 'completed' && data.winner) {
            if (data.winner === currentUser.uid) {
              // setGameResult('win'); // Commented out
            } else if (data.winner === 'draw') {
              // setGameResult('draw'); // Commented out
            } else {
              // setGameResult('loss'); // Commented out
            }
          }
        } else {
          setError('Game session not found.');
          setGameSession(null);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error loading game session:', err);
        setError('Failed to load game session');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [effectiveSessionId, currentUser, joinedGame, displayGameTypeInfo]); // Added displayGameTypeInfo

  // Load game chat messages
  useEffect(() => {
    if (!effectiveSessionId || !currentUser) {
      setGameMessages([]); // Clear messages if no active session
      return;
    }
    
    const messagesRef = collection(db, 'gameMessages');
    const q = query(
      messagesRef,
      where('gameSessionId', '==', effectiveSessionId),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs: Message[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          gameSessionId: data.gameSessionId,
          senderId: data.senderId,
          text: data.text,
          timestamp: data.timestamp, // Keep as Firestore Timestamp or convert to Date
          type: data.type || 'chat'
        });
      });
      
      setGameMessages(msgs);
      
      // Scroll to bottom after a slight delay to ensure render is complete
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
    
    return () => unsubscribe();
  }, [effectiveSessionId, currentUser]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameMessages]);

  // TRUTH OR LIE GAME FUNCTIONS
  const handleTruthLieSubmit = async (statements: string[], truthIndex: number) => { // Accept parameters
    if (!gameSession || !currentUser || !effectiveSessionId) return;
    
    // Use passed parameters for validation
    if (statements.some(s => !s.trim()) || truthIndex === null) {
      alert("Please fill in all statements and select which one is true.");
      return;
    }

    console.log("handleTruthLieSubmit in Games.tsx called with:", statements, truthIndex);
    
    try {
      const opponentId = gameSession.player1 === currentUser.uid ? gameSession.player2 : gameSession.player1;

      // Create the new round data - ensure all fields have valid values (no undefined)
      const newRound = {
        playerMakingStatements: currentUser.uid,
        statements: statements.map((text, index) => ({ text, isTruth: index === truthIndex })),
        guesser: opponentId, // The opponent will guess
        // Remove undefined values from the object
        // We'll use null instead since Firestore accepts null but not undefined
        guess: null,
        isCorrect: null
      };
      
      const gameSessionRef = doc(db, 'gameSessions', effectiveSessionId);
      
      // First check if the rounds array exists
      const gameSessionSnap = await getDoc(gameSessionRef);
      const sessionData = gameSessionSnap.data();
      
      // If rounds array doesn't exist yet, create it with set instead of using arrayUnion
      if (!sessionData?.gameData?.rounds) {
        await updateDoc(gameSessionRef, {
          'gameData.rounds': [newRound],
          'gameData.currentRound': 0, // First round
          'gameData.playerMakingStatements': opponentId,
          'gameData.playerGuessing': opponentId,  
          'gameData.submittedStatements': statements.map((text, index) => ({ text, isTruth: index === truthIndex })),
          'gameData.truthIndex': truthIndex,
          'gameData.roundPhase': 'guessing',
          currentTurn: opponentId,
          lastMoveAt: serverTimestamp()
        });
      } else {
        // If rounds array exists, use arrayUnion as before
        await updateDoc(gameSessionRef, {
          'gameData.rounds': arrayUnion(newRound),
          'gameData.currentRound': (gameSession.gameData.currentRound || 0) + 1,
          'gameData.playerMakingStatements': opponentId,
          'gameData.playerGuessing': opponentId,
          'gameData.submittedStatements': statements.map((text, index) => ({ text, isTruth: index === truthIndex })),
          'gameData.truthIndex': truthIndex,
          'gameData.roundPhase': 'guessing',
          currentTurn: opponentId,
          lastMoveAt: serverTimestamp()
        });
      }
      
      await addDoc(collection(db, 'gameMessages'), {
        gameSessionId: effectiveSessionId,
        senderId: currentUser.uid,
        text: `${currentUser.displayName} has submitted their statements. It's ${opponent?.displayName || 'Opponent'}'s turn to guess!`,
        timestamp: serverTimestamp(),
        type: 'game'
      });
      
      // Reset parent states
      setTruthLieStatements(["", ""]);
      setTruthLieTruthIndex(null);
      
    } catch (error) {
      console.error('Error submitting truth or lie:', error);
      alert("Failed to submit your statements. Please try again.");
    }
  };
  
  const handleTruthLieGuess = async (roundIndex: number, statementIndex: number) => {
    if (!gameSession || !currentUser || !effectiveSessionId) return;
    
    try {
      console.log("Making a guess:", roundIndex, statementIndex);
      console.log("Game data:", gameSession.gameData);
      
      // Validate game data structure
      if (!gameSession.gameData || !gameSession.gameData.rounds) {
        console.error("Game data or rounds array not found");
        alert("Error: Game data is incomplete. Please refresh the page and try again.");
        return;
      }
      
      // Ensure we're using the correct round index
      const actualRoundIndex = typeof gameSession.gameData.currentRound === 'number' 
        ? gameSession.gameData.currentRound - 1 // currentRound is 1-indexed, arrays are 0-indexed
        : roundIndex;
      
      console.log("Using round index:", actualRoundIndex);
      
      // Check if round exists at the specified index
      if (!gameSession.gameData.rounds[actualRoundIndex]) {
        console.error(`Round not found at index ${actualRoundIndex}`);
        console.error("Available rounds:", gameSession.gameData.rounds.length);
        
        // Try to use the last round if available
        if (gameSession.gameData.rounds.length > 0) {
          const lastRoundIndex = gameSession.gameData.rounds.length - 1;
          console.log("Falling back to last round at index:", lastRoundIndex);
          if (!gameSession.gameData.rounds[lastRoundIndex]) {
            console.error("Last round not found either");
            alert("Error: Round data not found. Please refresh the page and try again.");
            return;
          }
        } else {
          alert("Error: No rounds available. Please refresh the page and try again.");
          return;
        }
      }
      
      const round = gameSession.gameData.rounds[actualRoundIndex];
      console.log("Round data:", round);
      
      // Check if this round has already been guessed
      if (round.guess !== undefined && round.guess !== null) {
        console.log("Round already guessed");
        return; // Prevent re-guessing
      }
      
      // Find if statement at index is truth
      if (!round.statements || !Array.isArray(round.statements)) {
        console.error("Round statements are invalid:", round.statements);
        alert("Error: Invalid round data. Please refresh the page and try again.");
        return;
      }
      
      const truthIndex = round.statements.findIndex((s: { text: string; isTruth: boolean }) => s.isTruth);
      const isCorrect = statementIndex === truthIndex;
      
      console.log("Truth index:", truthIndex, "Guessed index:", statementIndex, "Is correct:", isCorrect);
      
      // Create new round data with the guess
      const updatedRound = {
        ...round,
        guess: statementIndex,
        isCorrect: isCorrect
      };
      
      // Get current scores from gameData
      const currentScores = gameSession.gameData.scores || { 
        [gameSession.player1]: 0, 
        [gameSession.player2]: 0 
      };
      
      // Update score if the guess was correct
      let updatedScores = { ...currentScores };
      if (isCorrect) {
        updatedScores[currentUser.uid] = (currentScores[currentUser.uid] || 0) + 1;
      }
      
      // Update game session - use a different approach to update nested array objects
      const gameSessionRef = doc(db, 'gameSessions', effectiveSessionId);
      
      // First, get all rounds and update the specific one we're changing
      const allRounds = [...gameSession.gameData.rounds];
      allRounds[actualRoundIndex] = updatedRound;
      
      // Reset to submitting phase for the next player after a guess
      await updateDoc(gameSessionRef, {
        'gameData.rounds': allRounds,
        'gameData.scores': updatedScores,
        'gameData.roundPhase': 'submitting', // Change to submitting for the next player
        'gameData.playerMakingStatements': currentUser.uid, // Guesser becomes statement maker
        'gameData.playerGuessing': round.playerMakingStatements, // Statement maker becomes guesser
        'gameData.submittedStatements': null, // Clear previous statements
        'gameData.truthIndex': null, // Clear previous truth index
        currentTurn: currentUser.uid, // Switch turn to current user to make statements
        lastMoveAt: serverTimestamp()
      });
      
      // Add a game message about the guess
      await addDoc(collection(db, 'gameMessages'), {
        gameSessionId: effectiveSessionId,
        senderId: currentUser.uid,
        text: isCorrect 
          ? `${currentUser.displayName} correctly guessed statement #${statementIndex + 1} was true! (+1 point)` 
          : `${currentUser.displayName} guessed statement #${statementIndex + 1}, but the truth was statement #${truthIndex + 1}!`,
        timestamp: serverTimestamp(),
        type: 'game'
      });
      
      // Check if this was the last round (e.g., maxRounds reached)
      if (gameSession.gameData.currentRound >= (gameSession.gameData.maxRounds || 5)) {
        // Count correct guesses for each player
        const player1Score = updatedScores[gameSession.player1] || 0;
        const player2Score = updatedScores[gameSession.player2] || 0;
        
        let winner = null;
        if (player1Score > player2Score) {
          winner = gameSession.player1;
        } else if (player2Score > player1Score) {
          winner = gameSession.player2;
        } else {
          winner = 'draw';
        }
        
        // Update game status
        await updateDoc(gameSessionRef, {
          status: 'completed',
          winner: winner
        });
      }
      
    } catch (error) {
      console.error('Error making a guess:', error);
      alert("Failed to submit your guess. Please try again.");
    }
  };
  // RIDDLES GAME FUNCTIONS
  const handleRiddleSubmit = async () => {
    if (!gameSession || !currentUser || !effectiveSessionId) return;
    
    try {
      const riddlesData = gameSession.gameData as RiddlesGameData;
      const currentRiddle = riddlesData.currentRiddle;
      const gameSessionRef = doc(db, 'gameSessions', effectiveSessionId);
      
      // Trường hợp đoán câu đố - chỉ xử lý khi người chơi hiện tại là người đoán
      // và đã nhập câu trả lời
      if (currentRiddle && gameSession.currentTurn === currentUser.uid && 
          currentRiddle.createdBy !== currentUser.uid && riddleAnswer.trim()) {
        
        // Lấy thông tin về số lần đoán hiện tại
        const currentAttempts = riddlesData.guessAttempts || 0;
        
        // Kiểm tra xem đã hết lượt đoán chưa
        if (currentAttempts >= 5) {
          alert("You've used all your guesses for this riddle.");
          return;
        }
        
        // Tăng số lần đoán và lưu lịch sử đoán
        const newAttempts = currentAttempts + 1;
        const guessHistory = [...(riddlesData.guessHistory || []), riddleAnswer.trim()];
        
        // Kiểm tra đáp án
        const isCorrect = riddleAnswer.trim().toLowerCase() === currentRiddle.answer.toLowerCase();
        
        // Tính điểm dựa vào số lượng hints đã dùng nếu đoán đúng
        const hintsUsed = riddlesData.visibleHintCount - 1; // visibleHintCount bắt đầu từ 1
        const pointsEarned = isCorrect ? Math.max(4 - riddlesData.visibleHintCount, 1) : 0;
        
        // Nếu đoán đúng hoặc đã hết 5 lượt, hiển thị kết quả
        if (isCorrect || newAttempts >= 5) {
          // Nếu đã đoán sai 5 lần, tính điểm cho người tạo câu đố
          let creatorPoints = 0;
          if (!isCorrect) {
            if (hintsUsed === 2) { // Đã dùng cả 2 gợi ý bổ sung
              creatorPoints = 3;
            } else if (hintsUsed === 1) { // Chỉ dùng 1 gợi ý bổ sung
              creatorPoints = 2; 
            } else if (hintsUsed === 0) { // Không dùng gợi ý nào
              creatorPoints = 1;
            }
          }
          
          // Cập nhật điểm số
          const scoreUpdate: any = {};
          if (isCorrect) {
            scoreUpdate[`gameData.score.${currentUser.uid}`] = (riddlesData.score?.[currentUser.uid] || 0) + pointsEarned;
          } else if (creatorPoints > 0) {
            scoreUpdate[`gameData.score.${currentRiddle.createdBy}`] = (riddlesData.score?.[currentRiddle.createdBy] || 0) + creatorPoints;
          }
          
          // Cập nhật thông tin đoán
          const lastGuess = {
            guess: riddleAnswer,
            playerId: currentUser.uid,
            isCorrect: isCorrect,
            pointsEarned: pointsEarned,
            creatorPoints: creatorPoints,
            hintsUsed: hintsUsed
          };
          
          // Thêm vào lịch sử
          const pastRiddle = {
            ...currentRiddle,
            guessedBy: currentUser.uid,
            guessCorrect: isCorrect,
            pointsEarned: pointsEarned,
            creatorPoints: creatorPoints,
            hintsUsed: hintsUsed,
            attempts: newAttempts
          };
          
          // Cập nhật game session
          await updateDoc(gameSessionRef, {
            'gameData.guessAttempts': newAttempts,
            'gameData.guessHistory': guessHistory,
            'gameData.lastGuess': lastGuess,
            'gameData.riddleRevealed': true,
            'gameData.pastRiddles': arrayUnion(pastRiddle),
            ...scoreUpdate,
          });
          
          // Thêm tin nhắn thông báo kết quả
          const resultMessage = isCorrect
            ? `${currentUser.displayName} correctly answered: "${riddleAnswer}" and earned ${pointsEarned} points!`
            : `${currentUser.displayName} couldn't guess the answer after ${newAttempts} attempts. The answer was: "${currentRiddle.answer}"`;
            
          await addDoc(collection(db, 'gameMessages'), {
            gameSessionId: effectiveSessionId,
            senderId: currentUser.uid,
            text: resultMessage,
            timestamp: serverTimestamp(),
            type: 'game'
          });
          
          // Thêm tin nhắn về điểm của người tạo câu đố nếu có
          if (creatorPoints > 0) {
            const opponentName = opponent?.displayName || 'Opponent';
            const creatorName = currentRiddle.createdBy === currentUser.uid ? 'You' : opponentName;
            
            await addDoc(collection(db, 'gameMessages'), {
              gameSessionId: effectiveSessionId,
              senderId: currentUser.uid,
              text: `${creatorName} earned ${creatorPoints} points for creating a challenging riddle!`,
              timestamp: serverTimestamp(),
              type: 'game'
            });
          }
          
          // Sau một khoảng thời gian, chuyển lượt sang người đoán để họ tạo câu đố mới
          // Sửa lại logic ở đây: chuyển lượt cho người vừa đoán (người hiện tại) để họ tạo câu đố mới
          setTimeout(async () => {
            await updateDoc(gameSessionRef, {
              'gameData.currentRiddle': null,
              'gameData.visibleHintCount': 1,
              'gameData.riddleRevealed': true, // Vẫn giữ để hiển thị kết quả
              'gameData.guessAttempts': 0 // Reset số lần đoán
            });
          }, 3000);
          
          setRiddleAnswer('');
        } else {
          // Nếu chưa đoán đúng và chưa hết lượt, chỉ cập nhật số lần đoán và lịch sử
          await updateDoc(gameSessionRef, {
            'gameData.guessAttempts': newAttempts,
            'gameData.guessHistory': guessHistory
          });
          
          // Thêm tin nhắn thông báo
          await addDoc(collection(db, 'gameMessages'), {
            gameSessionId: effectiveSessionId,
            senderId: currentUser.uid,
            text: `${currentUser.displayName} guessed: "${riddleAnswer}" (Attempt ${newAttempts}/5)`,
            timestamp: serverTimestamp(),
            type: 'game'
          });
          
          setRiddleAnswer('');
        }
      } 
    } catch (error) {
      console.error('Error submitting riddle answer:', error);
      alert("Failed to submit your answer. Please try again.");
    }
  };

  // Cập nhật lại hàm tạo riddle để thêm các trường mới
  const handleCreateRiddle = async (riddle: {answer: string, hints: string[]}) => {
    if (!gameSession || !currentUser || !effectiveSessionId) return;
    
    try {
      const gameSessionRef = doc(db, 'gameSessions', effectiveSessionId);
      const opponentId = gameSession.player1 === currentUser.uid ? gameSession.player2 : gameSession.player1;
      
      // Tạo riddle mới
      const newRiddle = {
        answer: riddle.answer,
        hints: riddle.hints,
        createdBy: currentUser.uid
      };
      
      // Cập nhật game session và chuyển lượt sang cho người đoán (đối thủ)
      await updateDoc(gameSessionRef, {
        'gameData.currentRiddle': newRiddle,
        'gameData.visibleHintCount': 1,
        'gameData.riddleRevealed': false,
        'gameData.lastGuess': null,
        'gameData.guessAttempts': 0, // Khởi tạo số lần đoán là 0
        'gameData.guessHistory': [], // Khởi tạo lịch sử đoán là mảng rỗng
        currentTurn: opponentId, // Chuyển lượt cho đối thủ để họ đoán
        lastMoveAt: serverTimestamp()
      });
      
      // Thêm tin nhắn thông báo
      await addDoc(collection(db, 'gameMessages'), {
        gameSessionId: effectiveSessionId,
        senderId: currentUser.uid,
        text: `${currentUser.displayName} has created a new riddle! It's ${opponent?.displayName || 'Opponent'}'s turn to guess (5 attempts allowed).`,
        timestamp: serverTimestamp(),
        type: 'game'
      });
      
    } catch (error) {
      console.error('Error creating riddle:', error);
      alert("Failed to create your riddle. Please try again.");
    }
  };
  
  // Cập nhật lại hàm yêu cầu hint
  const handleRequestHint = async () => {
    if (!gameSession || !currentUser || !effectiveSessionId) return;
    
    try {
      const riddlesData = gameSession.gameData as RiddlesGameData;
      
      // Kiểm tra giới hạn số lượng hints
      if (riddlesData.visibleHintCount >= 3) {
        alert("All hints have been revealed.");
        return;
      }
      
      // Tăng số lượng hints hiển thị
      const gameSessionRef = doc(db, 'gameSessions', effectiveSessionId);
      await updateDoc(gameSessionRef, {
        'gameData.visibleHintCount': riddlesData.visibleHintCount + 1,
      });
      
      // Thêm tin nhắn thông báo
      await addDoc(collection(db, 'gameMessages'), {
        gameSessionId: effectiveSessionId,
        senderId: currentUser.uid,
        text: `${currentUser.displayName} has requested another hint (${riddlesData.visibleHintCount + 1}/3).`,
        timestamp: serverTimestamp(),
        type: 'game'
      });
      
    } catch (error) {
      console.error('Error requesting hint:', error);
      alert("Failed to request hint. Please try again.");
    }
  };

  // Handle abandoning the game
  const handleAbandonGame = async () => {
    if (!gameSession || !currentUser || !effectiveSessionId) return; // Add check for effectiveSessionId
    
    if (window.confirm('Are you sure you want to abandon the game? This will count as a loss.')) {
      try {
        // Update game session
        await updateDoc(doc(db, 'gameSessions', effectiveSessionId), {
          status: 'completed', // Mark as completed
          winner: gameSession.player1 === currentUser.uid ? gameSession.player2 : gameSession.player1, // Opponent wins
          lastMoveAt: serverTimestamp()
        });
        
        // Navigate back to chat
        navigate(`/chat/${gameSession.chatId}`);
      } catch (error) {
        console.error('Error abandoning game:', error);
      }
    }
  };
  
  // Game type to display name
  // const getGameTypeName = (type: string | undefined) => {
  //   if (!type) return "Game";
  //   switch (type) {
  //     case 'truth-or-lie':
  //       return "Truth or Lie";
  //     case 'word-chain':
  //       return "Word Chain";
  //     case 'proverbs':
  //       return "Proverbs Game";
  //     case 'riddles':
  //       return "Riddles Game";
  //     default:
  //       return "Game";
  //   }
  // };

  const renderGameContent = () => {
    if (loading && !displayGameTypeInfo) { // Don't show loading for game info page if session is not primary
      return (
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-purple-600"></div>
        </div>
      );
    }

    if (error) {
      return <div className="flex justify-center items-center min-h-screen text-red-500">Error: {error}</div>;
    }

    if (gameSession && currentUser) {
      switch (gameSession.gameType) {
        case 'truth-or-lie': // Corrected case
          return <TruthOrLieGame 
            gameSession={gameSession} 
            currentUser={currentUser}
            opponent={opponent} 
            onTruthLieSubmit={handleTruthLieSubmit} // Pass the corrected handler
            onTruthLieGuess={handleTruthLieGuess}
            onAbandonGame={handleAbandonGame}
          />;
        case 'riddles': // Riddles case
          return <RiddlesGame 
            gameSession={gameSession} 
            currentUser={currentUser}
            opponent={opponent} 
            answer={riddleAnswer}
            setAnswer={setRiddleAnswer}
            onSubmit={handleRiddleSubmit}
            onShowHint={() => setShowHint(true)}
            showHint={showHint}
            onAbandonGame={handleAbandonGame}
            onCreateRiddle={handleCreateRiddle}
            onRequestHint={handleRequestHint}
          />;
        default:
          return <div>Unsupported game type: {gameSession.gameType}</div>;
      }
    }

    // Render Game Info Page
    if (displayGameTypeInfo) {
      return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-bold mb-4">About {displayGameTypeInfo.replace('-', ' ')}</h1>
          <p>This page would contain information and rules about the {displayGameTypeInfo.replace('-', ' ')} game.</p>
          <button onClick={() => navigate('/games')} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            Back to Game Lobby
          </button>
        </div>
      );
    }

    // Fallback: Game Lobby (if no session ID and no specific game type info to display)
    return (
      <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 text-white">
        <h1 className="text-4xl font-bold mb-8 text-center">Game Lobby</h1>
        <p className="text-lg mb-6 text-center">Select a game to view information or start a new session from a chat.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Truth or Lie Card */}
          <div className="bg-white/20 backdrop-blur-md p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
            <h2 className="text-2xl font-semibold mb-3">Truth or Lie</h2>
            <p className="text-sm mb-4">Challenge your friends to guess which of your statements is the truth!</p>
            <button 
              onClick={() => navigate('/games/truth-or-lie')} 
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-150"
            >
              View Game Info
            </button>
          </div>

          {/* Word Chain Card */}
          <div className="bg-white/20 backdrop-blur-md p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
            <h2 className="text-2xl font-semibold mb-3">Word Chain</h2>
            <p className="text-sm mb-4">Link words together, starting with the last letter of the previous word.</p>
            <button 
              onClick={() => navigate('/games/word-chain')} 
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-150"
            >
              View Game Info
            </button>
          </div>

          {/* Proverbs Game Card */}
          <div className="bg-white/20 backdrop-blur-md p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
            <h2 className="text-2xl font-semibold mb-3">Proverbs Game</h2>
            <p className="text-sm mb-4">Complete well-known proverbs. How many can you get right?</p>
            <button 
              onClick={() => navigate('/games/proverbs')} 
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-150"
            >
              View Game Info
            </button>
          </div>

          {/* Riddles Game Card */}
          <div className="bg-white/20 backdrop-blur-md p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
            <h2 className="text-2xl font-semibold mb-3">Riddles Game</h2>
            <p className="text-sm mb-4">Test your wits by solving challenging riddles.</p>
            <button 
              onClick={() => navigate('/games/riddles')} 
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-150"
            >
              View Game Info
            </button>
          </div>
        </div>

        <div className="mt-12 text-center">
          <button 
            onClick={() => navigate('/chats')} 
            className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition duration-150 text-lg"
          >
            Back to Chats
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Main Game Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderGameContent()}
      </div>
    </div>
  );
};

export default Games;