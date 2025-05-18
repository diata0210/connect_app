import React, { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

interface RandomQuestionGameProps {
  chatId: string;
  currentUserId: string;
  onClose: () => void;
}

// Danh sách câu hỏi phá băng theo nhiều chủ đề
const QUESTION_CATEGORIES = {
  fun: [
    "Nếu bạn có thể chọn một sức mạnh siêu nhiên, bạn sẽ chọn gì?",
    "Bộ phim mà bạn có thể xem đi xem lại nhiều lần nhất là gì?",
    "Nếu bạn có một ngày để đi đến bất kỳ đâu trên thế giới, bạn sẽ đi đâu?",
    "Bạn thích món ăn gì nhất và tại sao?",
    "Nếu bạn phải nghe một bài hát trong suốt quãng đời còn lại, đó sẽ là bài gì?"
  ],
  thoughtful: [
    "Điều gì khiến bạn cảm thấy biết ơn nhất trong cuộc sống hiện tại?",
    "Bạn đã học được bài học quý giá nhất nào trong năm qua?",
    "Nếu có thể nói chuyện với bản thân lúc nhỏ, bạn sẽ nói gì?",
    "Điều gì luôn khiến bạn cảm thấy bình yên bất kể mọi chuyện?",
    "Bạn nghĩ thành công thực sự nghĩa là gì?"
  ],
  language: [
    "Từ yêu thích của bạn trong tiếng Anh là gì và tại sao?",
    "Bạn thích học ngôn ngữ theo cách nào nhất?",
    "Có phương ngữ hoặc tiếng địa phương nào mà bạn thấy thú vị không?",
    "Bạn nghĩ ngôn ngữ nào khó học nhất?",
    "Một câu nói hay câu tục ngữ mà bạn thích nhất là gì?"
  ],
  preferences: [
    "Bạn thích mùa nào nhất trong năm?",
    "Nếu phải chọn giữa núi và biển, bạn sẽ chọn gì?",
    "Buổi sáng hay buổi tối - khi nào bạn cảm thấy năng suất nhất?",
    "Thể loại sách yêu thích của bạn là gì?",
    "Thú cưng lý tưởng của bạn là gì?"
  ],
  hypothetical: [
    "Nếu bạn có máy thời gian, bạn sẽ đi đến thời điểm nào trong lịch sử?",
    "Nếu bạn có thể trở thành chuyên gia ngay lập tức trong một lĩnh vực, đó sẽ là gì?",
    "Nếu bạn có thể sống ở bất kỳ đất nước nào khác, bạn sẽ chọn đâu?",
    "Nếu cuộc sống của bạn là một bộ phim, tiêu đề của nó sẽ là gì?",
    "Nếu bạn có thể dành một ngày với bất kỳ người nổi tiếng nào (sống hay đã mất), bạn sẽ chọn ai?"
  ]
};

// Tất cả các chủ đề
const ALL_CATEGORIES = Object.keys(QUESTION_CATEGORIES) as Array<keyof typeof QUESTION_CATEGORIES>;

const RandomQuestionGame: React.FC<RandomQuestionGameProps> = ({
  chatId,
  currentUserId,
  onClose
}) => {
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof QUESTION_CATEGORIES | 'all'>('all');
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sentQuestions, setSentQuestions] = useState<string[]>([]);

  // Hàm lấy câu hỏi ngẫu nhiên
  const getRandomQuestion = () => {
    setIsGenerating(true);
    
    let availableQuestions: string[] = [];
    
    if (selectedCategory === 'all') {
      // Lấy tất cả câu hỏi từ mọi chủ đề
      ALL_CATEGORIES.forEach(category => {
        availableQuestions = [...availableQuestions, ...QUESTION_CATEGORIES[category]];
      });
    } else {
      // Lấy câu hỏi từ chủ đề được chọn
      availableQuestions = QUESTION_CATEGORIES[selectedCategory];
    }
    
    // Lọc ra những câu hỏi chưa được gửi
    const unusedQuestions = availableQuestions.filter(q => !sentQuestions.includes(q));
    
    // Nếu đã hết câu hỏi, sử dụng lại tất cả
    const questionsToUse = unusedQuestions.length > 0 ? unusedQuestions : availableQuestions;
    
    // Chọn câu hỏi ngẫu nhiên
    const randomIndex = Math.floor(Math.random() * questionsToUse.length);
    const question = questionsToUse[randomIndex];
    
    setCurrentQuestion(question);
    setIsGenerating(false);
  };

  useEffect(() => {
    // Tự động tạo câu hỏi khi component được tải
    getRandomQuestion();
  }, [selectedCategory]); // Tạo lại khi thay đổi chủ đề

  // Hàm gửi câu hỏi vào cuộc trò chuyện
  const sendQuestion = async () => {
    if (!currentQuestion) return;

    try {
      // Thêm câu hỏi vào tin nhắn chat
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: currentUserId,
        text: `🎲 ${currentQuestion}`,
        timestamp: serverTimestamp()
      });

      // Cập nhật danh sách câu hỏi đã gửi
      setSentQuestions(prev => [...prev, currentQuestion]);
      
      // Tự động tạo câu hỏi mới
      getRandomQuestion();
      
      // Đóng modal nếu cần
      onClose();
    } catch (error) {
      console.error('Error sending question:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Câu Đố Ngẫu Nhiên</h2>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <p className="text-gray-600 mb-4">
            Dùng câu hỏi ngẫu nhiên để bắt đầu cuộc trò chuyện thú vị!
          </p>
          
          {/* Chọn chủ đề */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Chủ đề:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tất cả chủ đề</option>
              <option value="fun">Vui nhộn</option>
              <option value="thoughtful">Suy ngẫm</option>
              <option value="language">Ngôn ngữ</option>
              <option value="preferences">Sở thích</option>
              <option value="hypothetical">Giả định</option>
            </select>
          </div>
          
          {/* Hiển thị câu hỏi */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            {isGenerating ? (
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-blue-200 rounded w-3/4"></div>
                  <div className="h-4 bg-blue-200 rounded"></div>
                </div>
              </div>
            ) : (
              <p className="text-lg text-blue-800">{currentQuestion}</p>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={getRandomQuestion}
              className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition-colors"
              disabled={isGenerating}
            >
              Câu hỏi khác
            </button>
            <button
              onClick={sendQuestion}
              className="flex-1 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              disabled={isGenerating || !currentQuestion}
            >
              Gửi câu hỏi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RandomQuestionGame;
