import { useState } from 'react';
import { currentMockUser } from '../mockData';

// Game types and interfaces
interface Question {
  id: number;
  text: string;
}

interface TwoTruthsOneLieGame {
  statements: string[];
  answer: number | null;
}

const Games = () => {
  const [user] = useState<any>(currentMockUser);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  
  // Question Game
  const [questions] = useState<Question[]>([
    { id: 1, text: "If you could have dinner with anyone in the world, who would it be?" },
    { id: 2, text: "What's your favorite place you've ever visited?" },
    { id: 3, text: "What's one skill you wish you had?" },
    { id: 4, text: "If you could live in any fictional world, which would you choose?" },
    { id: 5, text: "What's something you're looking forward to this year?" },
    { id: 6, text: "What was your childhood dream job?" },
    { id: 7, text: "If you had to eat one food for the rest of your life, what would it be?" },
    { id: 8, text: "What's the best piece of advice you've ever received?" },
    { id: 9, text: "What's a hobby you've always wanted to try?" },
    { id: 10, text: "What's your favorite way to spend a day off?" },
  ]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  // Word Association Game
  const [word, setWord] = useState<string>('');
  const [previousWords, setPreviousWords] = useState<string[]>([]);
  const [inputWord, setInputWord] = useState<string>('');
  
  // Two Truths and a Lie Game
  const [twoTruthsGame, setTwoTruthsGame] = useState<TwoTruthsOneLieGame>({
    statements: ['', '', ''],
    answer: null
  });
  const [twoTruthsStep, setTwoTruthsStep] = useState<'setup' | 'play' | 'result'>('setup');
  const [selectedLie, setSelectedLie] = useState<number | null>(null);

  // Function to start the question game
  const startQuestionGame = () => {
    setActiveGame('questions');
    getRandomQuestion();
  };

  // Function to get a random question
  const getRandomQuestion = () => {
    const randomIndex = Math.floor(Math.random() * questions.length);
    setCurrentQuestion(questions[randomIndex]);
  };

  // Function to start the word association game
  const startWordAssociationGame = () => {
    setActiveGame('word-association');
    const startingWords = ['Friend', 'Travel', 'Music', 'Food', 'Book', 'Movie', 'Adventure'];
    const randomWord = startingWords[Math.floor(Math.random() * startingWords.length)];
    setWord(randomWord);
    setPreviousWords([randomWord]);
    setInputWord('');
  };

  // Function to submit a word in the word association game
  const submitWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputWord.trim() === '') return;
    
    setPreviousWords([inputWord, ...previousWords]);
    setWord(inputWord);
    setInputWord('');
  };

  // Function to start the Two Truths and a Lie game
  const startTwoTruthsGame = () => {
    setActiveGame('two-truths');
    setTwoTruthsGame({
      statements: ['', '', ''],
      answer: null
    });
    setTwoTruthsStep('setup');
  };

  // Function to handle statement changes in Two Truths game
  const handleStatementChange = (index: number, value: string) => {
    const newStatements = [...twoTruthsGame.statements];
    newStatements[index] = value;
    setTwoTruthsGame({
      ...twoTruthsGame,
      statements: newStatements
    });
  };

  // Function to set the lie in Two Truths game
  const setLie = (index: number) => {
    setTwoTruthsGame({
      ...twoTruthsGame,
      answer: index
    });
    setTwoTruthsStep('play');
  };

  // Function to guess the lie in Two Truths game
  const guessLie = (index: number) => {
    setSelectedLie(index);
    setTwoTruthsStep('result');
  };

  // Function to reset all games
  const resetGames = () => {
    setActiveGame(null);
    setCurrentQuestion(null);
    setWord('');
    setPreviousWords([]);
    setInputWord('');
    setTwoTruthsGame({
      statements: ['', '', ''],
      answer: null
    });
    setTwoTruthsStep('setup');
    setSelectedLie(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Ice Breaker Games</h1>
        <p className="text-lg text-gray-600 mb-8 text-center">
          Play these simple games to help reduce awkwardness when chatting with new people.
        </p>

        {!activeGame ? (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Question Game</h2>
              <p className="text-gray-600 mb-4">
                Get a random interesting question to discuss with your match.
              </p>
              <button
                onClick={startQuestionGame}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-500"
              >
                Start Game
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Word Association</h2>
              <p className="text-gray-600 mb-4">
                Respond with a word that you associate with the previous word.
              </p>
              <button
                onClick={startWordAssociationGame}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-500"
              >
                Start Game
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Two Truths & A Lie</h2>
              <p className="text-gray-600 mb-4">
                Share two true facts and one lie, and let others guess which is the lie.
              </p>
              <button
                onClick={startTwoTruthsGame}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-500"
              >
                Start Game
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md">
            {/* Question Game */}
            {activeGame === 'questions' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Question Game</h2>
                {currentQuestion && (
                  <div className="mb-6 text-center">
                    <p className="text-xl text-gray-700 mb-6 p-4 bg-indigo-50 rounded-lg">
                      {currentQuestion.text}
                    </p>
                    <p className="text-gray-600 mb-8">
                      Discuss this question with your match to learn more about each other!
                    </p>
                  </div>
                )}
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={getRandomQuestion}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-500"
                  >
                    Next Question
                  </button>
                  <button
                    onClick={resetGames}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-medium hover:bg-gray-300"
                  >
                    Exit Game
                  </button>
                </div>
              </div>
            )}

            {/* Word Association Game */}
            {activeGame === 'word-association' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Word Association</h2>
                <div className="mb-6">
                  <div className="flex justify-center">
                    <div className="inline-block bg-indigo-100 text-indigo-800 px-6 py-3 rounded-lg text-xl font-medium mb-6">
                      {word}
                    </div>
                  </div>
                  <form onSubmit={submitWord} className="mb-4">
                    <div className="flex items-center justify-center space-x-2">
                      <input
                        type="text"
                        value={inputWord}
                        onChange={(e) => setInputWord(e.target.value)}
                        placeholder="Enter a related word..."
                        className="px-3 py-2 border border-gray-300 rounded-md flex-grow max-w-md"
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-500"
                      >
                        Submit
                      </button>
                    </div>
                  </form>

                  {previousWords.length > 1 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium text-gray-700 mb-2">Word Chain:</h3>
                      <div className="flex flex-wrap justify-center gap-2">
                        {previousWords.map((prev, index) => (
                          <span key={index} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-md text-sm">
                            {prev}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={resetGames}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-medium hover:bg-gray-300"
                  >
                    Exit Game
                  </button>
                </div>
              </div>
            )}

            {/* Two Truths and a Lie Game */}
            {activeGame === 'two-truths' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Two Truths and a Lie</h2>
                
                {twoTruthsStep === 'setup' && (
                  <div>
                    <p className="text-gray-600 mb-6 text-center">
                      Enter two true statements and one false statement about yourself.
                      Then mark which one is the lie.
                    </p>
                    <div className="space-y-4 mb-6">
                      {twoTruthsGame.statements.map((statement, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={statement}
                            onChange={(e) => handleStatementChange(index, e.target.value)}
                            placeholder={`Statement ${index + 1}`}
                            className="px-3 py-2 border border-gray-300 rounded-md flex-grow"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-gray-600 mb-4 text-center">Now select which statement is the lie:</p>
                    <div className="space-y-2 mb-6">
                      {twoTruthsGame.statements.map((statement, index) => (
                        <button
                          key={index}
                          onClick={() => setLie(index)}
                          disabled={!statement}
                          className={`w-full text-left p-3 rounded-md ${!statement ? 'bg-gray-100 text-gray-400' : 'bg-indigo-50 text-gray-800 hover:bg-indigo-100'}`}
                        >
                          {statement || `Statement ${index + 1}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {twoTruthsStep === 'play' && (
                  <div>
                    <p className="text-gray-600 mb-6 text-center">
                      Share these statements with your match and ask them to guess which one is the lie!
                    </p>
                    <div className="space-y-3 mb-6">
                      {twoTruthsGame.statements.map((statement, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-md">
                          {statement}
                        </div>
                      ))}
                    </div>
                    <p className="text-gray-600 mb-4 text-center">
                      Which statement did they think is the lie?
                    </p>
                    <div className="space-y-2 mb-6">
                      {twoTruthsGame.statements.map((statement, index) => (
                        <button
                          key={index}
                          onClick={() => guessLie(index)}
                          className="w-full text-left p-3 rounded-md bg-indigo-50 text-gray-800 hover:bg-indigo-100"
                        >
                          {statement}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {twoTruthsStep === 'result' && (
                  <div>
                    <h3 className="text-xl font-semibold text-center mb-6">
                      {selectedLie === twoTruthsGame.answer ? 
                        "They got it right!" : 
                        "They didn't guess correctly!"}
                    </h3>
                    <div className="space-y-3 mb-6">
                      {twoTruthsGame.statements.map((statement, index) => (
                        <div 
                          key={index} 
                          className={`p-3 rounded-md ${
                            index === twoTruthsGame.answer 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {statement}
                          {index === twoTruthsGame.answer && " (The Lie)"}
                          {index !== twoTruthsGame.answer && " (Truth)"}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={startTwoTruthsGame}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-500"
                      >
                        Play Again
                      </button>
                      <button
                        onClick={resetGames}
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-medium hover:bg-gray-300"
                      >
                        Exit Game
                      </button>
                    </div>
                  </div>
                )}

                {twoTruthsStep !== 'result' && (
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={resetGames}
                      className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-medium hover:bg-gray-300"
                    >
                      Exit Game
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Games;