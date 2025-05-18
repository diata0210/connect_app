import { db} from '../firebase';
import { 
  doc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { RiddlesGameData } from '../pages/Games';

// Khởi tạo mới một phiên riddle game
export const initializeRiddlesGame = async (gameSessionId: string, player1: string, player2: string) => {
  try {
    const gameSessionRef = doc(db, 'gameSessions', gameSessionId);
    
    const initialGameData: RiddlesGameData = {
      currentRiddle: null,
      visibleHintCount: 1,
      score: { [player1]: 0, [player2]: 0 },
      pastRiddles: [],
      guessAttempts: 0,
      guessHistory: []
    };
    
    await updateDoc(gameSessionRef, {
      gameData: initialGameData
    });
    
    return true;
  } catch (error) {
    console.error("Error initializing riddles game:", error);
    return false;
  }
};

// Tạo riddle mới
export const createRiddle = async (
  gameSessionId: string, 
  creatorId: string, 
  answer: string, 
  hints: string[], 
  opponentId: string
) => {
  try {
    const gameSessionRef = doc(db, 'gameSessions', gameSessionId);
    
    // Create the riddle
    const newRiddle = {
      answer,
      hints,
      createdBy: creatorId
    };
    
    await updateDoc(gameSessionRef, {
      'gameData.currentRiddle': newRiddle,
      'gameData.visibleHintCount': 1,
      'gameData.riddleRevealed': false,
      currentTurn: opponentId,
      lastMoveAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error creating riddle:", error);
    return false;
  }
};

// Yêu cầu gợi ý tiếp theo
export const requestNextHint = async (gameSessionId: string, currentVisibleHints: number) => {
  try {
    if (currentVisibleHints >= 3) {
      return false; // All hints already visible
    }
    
    const gameSessionRef = doc(db, 'gameSessions', gameSessionId);
    await updateDoc(gameSessionRef, {
      'gameData.visibleHintCount': currentVisibleHints + 1
    });
    
    return true;
  } catch (error) {
    console.error("Error requesting next hint:", error);
    return false;
  }
};

// Xử lý đoán riddle
export const submitRiddleGuess = async (
  gameSessionId: string, 
  guesserId: string,
  guess: string,
  currentRiddle: any,
  visibleHintCount: number,
  currentScore: number
) => {
  try {
    const gameSessionRef = doc(db, 'gameSessions', gameSessionId);
    
    const isCorrect = guess.toLowerCase() === currentRiddle.answer.toLowerCase();
    const pointsEarned = isCorrect ? Math.max(4 - visibleHintCount, 1) : 0;
    
    // Create past riddle record
    const pastRiddle = {
      ...currentRiddle,
      guessedBy: guesserId,
      guessCorrect: isCorrect,
      pointsEarned
    };
    
    // Update scores if correct
    const updatedFields: any = {
      'gameData.lastGuess': {
        guess,
        isCorrect,
        pointsEarned
      },
      'gameData.riddleRevealed': true,
      'gameData.pastRiddles': arrayUnion(pastRiddle)
    };
    
    if (isCorrect) {
      updatedFields[`gameData.score.${guesserId}`] = currentScore + pointsEarned;
    }
    
    await updateDoc(gameSessionRef, updatedFields);
    
    return {
      isCorrect,
      pointsEarned
    };
  } catch (error) {
    console.error("Error submitting riddle guess:", error);
    return false;
  }
};

// Các hàm cho các trò chơi khác cũng có thể được thêm vào đây

export default {
  initializeRiddlesGame,
  createRiddle,
  requestNextHint,
  submitRiddleGuess
};
