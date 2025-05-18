import React, { useState, useEffect } from 'react';
import { generateChatSuggestions } from '../../services/geminiService';

interface ChatSuggestionsProps {
  isAnonymousChat: boolean;
  otherUserName: string;
  sharedInterests: string[];
  onSuggestionSelect: (suggestion: string) => void;
  recentMessages?: string[]; 
}

const ChatSuggestions: React.FC<ChatSuggestionsProps> = ({
  isAnonymousChat,
  otherUserName,
  sharedInterests,
  onSuggestionSelect,
  recentMessages = []
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(recentMessages.length > 0); // Tự động thu gọn nếu có tin nhắn

  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoading(true);
      setError(false);

      try {
        const suggestions = await generateChatSuggestions({
          currentUser: 'Tôi',
          otherUser: otherUserName,
          sharedInterests,
          isAnonymousChat,
          messageHistory: recentMessages
        });
        
        setSuggestions(suggestions);
      } catch (err) {
        console.error('Error fetching chat suggestions:', err);
        setError(true);
        // Set fallback suggestions
        setSuggestions([
          "Chào bạn, hôm nay bạn có khỏe không?",
          "Bạn có sở thích gì vào cuối tuần vậy?",
          "Gần đây bạn đã xem bộ phim nào hay chưa?",
          "Bạn có thể chia sẻ về món ăn yêu thích của mình không?",
          "Hôm nay thời tiết ở chỗ bạn thế nào?"
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [isAnonymousChat, otherUserName, sharedInterests, recentMessages]);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-4 mb-2">
        <div className="flex justify-between items-center mb-2 sticky top-0 bg-white z-10 py-2">
          <h2 className="text-lg font-semibold">Gợi ý trò chuyện</h2>
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-8 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-2">
      <div className="flex justify-between items-center mb-3 sticky top-0 bg-white z-10 py-2">
        <h2 className="text-lg font-semibold">
          Gợi ý trò chuyện
          {recentMessages.length > 0 && !isCollapsed && (
            <span className="ml-2 text-xs text-gray-500">(Dựa trên cuộc trò chuyện hiện tại)</span>
          )}
        </h2>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="text-gray-500 hover:text-gray-700"
        >
          {isCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          )}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionSelect(suggestion)}
              className="text-left p-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatSuggestions;