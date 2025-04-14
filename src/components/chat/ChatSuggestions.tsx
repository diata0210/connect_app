import React, { useState, useEffect } from 'react';

interface ChatSuggestionsProps {
  isAnonymousChat: boolean;
  otherUserName: string;
  onSuggestionSelect: (text: string) => void;
  sharedInterests?: string[];
}

const ChatSuggestions: React.FC<ChatSuggestionsProps> = ({ 
  isAnonymousChat,
  otherUserName, 
  onSuggestionSelect,
  sharedInterests = []
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('icebreakers');
  const [showQuickResponses, setShowQuickResponses] = useState(false);
  
  // Auto-close suggestions after 30 seconds if user doesn't interact with them
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(false);
    }, 30000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Generate greeting name
  const greetingName = isAnonymousChat ? 'there' : otherUserName.split(' ')[0];
  
  // Quick responses for common situations
  const quickResponses = [
    "Hey, nice to meet you!",
    "How's your day going?",
    "That's interesting! Tell me more.",
    "Thanks for sharing that!",
    "Haha, that's funny! 😄",
    "Sorry, I didn't quite get that"
  ];
  
  // Categories with suggestions
  const suggestionsByCategory = {
    icebreakers: [
      `Hey ${greetingName}! What brings you to Connect app today?`,
      `Nice to meet you! How's your ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'} going?`,
      `Hi there! If you were a superhero, what would your power be?`,
      `Hi ${greetingName}! Would you rather be able to fly or be invisible? 😄`
    ],
    interests: sharedInterests.length > 0 ? [
      `I see we both like ${sharedInterests[0]}! What aspects of it do you enjoy most?`,
      `So you're into ${sharedInterests.join(', ')} too? That's awesome!`,
      `Since you like ${sharedInterests[0]}, have you tried ${sharedInterests[0] === 'music' ? 'going to any concerts recently' : 
                                                              sharedInterests[0] === 'gaming' ? 'any new games lately' : 
                                                              sharedInterests[0] === 'travel' ? 'visiting anywhere interesting lately' : 
                                                              'anything new related to that recently'}?`,
      `What got you interested in ${sharedInterests[0]} initially?`
    ] : [
      `What kind of hobbies do you enjoy in your free time?`,
      `Have you watched any good movies or shows recently?`,
      `Are you into any sports or outdoor activities?`,
      `What kind of music do you listen to?`
    ],
    games: [
      `Want to play a quick game to break the ice? I can do Tic Tac Toe!`,
      `How about a quick game of Would You Rather? Would you rather live in the mountains or by the beach?`,
      `Here's a fun one: if you could have dinner with anyone, living or dead, who would it be?`,
      `Let's play Two Truths and a Lie! I'll go first: I've been to Japan, I can speak 3 languages, and I hate chocolate. Which one is the lie?`
    ],
    funny: [
      `If you were a potato, how would you like to be cooked? 🥔`,
      `What's your most useless talent? Mine is making weird sounds with my elbows! 😄`,
      `If animals could talk, which would be the rudest?`,
      `What's the weirdest food combination you actually enjoy?`
    ],
    deep: [
      `What's something you're really passionate about right now?`,
      `If you could teleport anywhere in the world right now, where would you go?`,
      `What's one small thing that made you happy recently?`,
      `What's something you've always wanted to try but haven't yet?`
    ]
  };
  
  const categories = [
    { id: 'icebreakers', name: 'Ice Breakers', icon: '👋' },
    { id: 'interests', name: sharedInterests.length > 0 ? 'Shared Interests' : 'Interests', icon: '❤️' },
    { id: 'games', name: 'Quick Games', icon: '🎮' },
    { id: 'funny', name: 'Funny Questions', icon: '😂' },
    { id: 'deep', name: 'Deeper Talk', icon: '💭' }
  ];

  if (!isOpen) {
    return (
      <div className="flex justify-center mb-2">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full"
        >
          <span className="mr-1">💡</span>
          Need help starting a conversation?
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-3 mb-3 border border-gray-200 relative">
      <button
        onClick={() => setIsOpen(false)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        aria-label="Close suggestions"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-2">
          <span className="text-lg">🤖</span>
        </div>
        <div>
          <h3 className="text-sm font-medium">Chat Assistant</h3>
          {sharedInterests.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 max-w-xs overflow-x-hidden">
              {sharedInterests.slice(0, 3).map((interest, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                  {interest}
                </span>
              ))}
              {sharedInterests.length > 3 && (
                <span className="text-xs text-gray-500">+{sharedInterests.length - 3} more</span>
              )}
            </div>
          )}
        </div>
      </div>
      
      <p className="text-xs text-gray-500 mb-3">
        {isAnonymousChat 
          ? "Starting a conversation in anonymous mode can be easier - just be yourself!"
          : "Break the ice with these conversation starters:"}
      </p>
      
      {/* Categories */}
      <div className="flex space-x-2 mb-3 overflow-x-auto pb-1">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
              selectedCategory === category.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="mr-1">{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>
      
      {/* Suggestions */}
      <div className="space-y-2">
        {suggestionsByCategory[selectedCategory as keyof typeof suggestionsByCategory].map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionSelect(suggestion)}
            className="text-left w-full text-sm bg-gray-50 hover:bg-gray-100 p-2 rounded transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
      
      {/* Quick responses toggle */}
      <div className="mt-3 pt-2 border-t border-gray-100">
        <button
          onClick={() => setShowQuickResponses(!showQuickResponses)}
          className="flex items-center text-xs text-indigo-600 hover:text-indigo-800"
        >
          <span className="mr-1">{showQuickResponses ? '−' : '+'}</span>
          Quick Responses
        </button>
        
        {showQuickResponses && (
          <div className="flex flex-wrap gap-1 mt-2">
            {quickResponses.map((response, i) => (
              <button
                key={i}
                onClick={() => onSuggestionSelect(response)}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full"
              >
                {response}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSuggestions;