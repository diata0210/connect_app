import axios from 'axios';

const API_KEY = import.meta.env.VITE_GEMINI_API; // Sử dụng biến môi trường Vite

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
    finishReason: string;
  }[];
}

export const generateChatSuggestions = async (
  context: {
    currentUser: string;
    otherUser: string;
    sharedInterests?: string[];
    isAnonymousChat?: boolean;
    messageHistory?: string[];
  }
): Promise<string[]> => {
  try {
    if (!API_KEY) {
      console.error('Gemini API key is missing');
      return getDefaultSuggestions(context);
    }

    // Kiểm tra xem có local API proxy hay không
    // Nếu đang chạy trong môi trường phát triển, bạn có thể thêm một proxy server để tránh CORS
    let baseUrl = '';
    
    try {
      // Thử sử dụng proxy server nếu có
      baseUrl = import.meta.env.VITE_API_PROXY || '';
    } catch (e) {
      // Nếu không có proxy, sử dụng URL trực tiếp
      baseUrl = 'https://generativelanguage.googleapis.com';
    }

    const prompt = constructPrompt(context);
    
    // Thêm timeout để tránh chờ quá lâu
    const response = await axios.post(
      `${baseUrl}/v1/models/gemini-pro:generateContent?key=${API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 400,
          topP: 0.8,
          topK: 40
        }
      },
      {
        timeout: 10000, // 10 giây timeout
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    const data = response.data as GeminiResponse;
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error('Empty response from Gemini API');
      return getDefaultSuggestions(context);
    }
    
    // Parse response text as JSON array of suggestions
    try {
      const text = data.candidates[0].content.parts[0].text;
      // Extract the JSON array part from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        return Array.isArray(suggestions) ? suggestions.slice(0, 5) : getDefaultSuggestions(context);
      }
      return getDefaultSuggestions(context);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as suggestions array', parseError);
      return getDefaultSuggestions(context);
    }
  } catch (error) {
    console.error('Error generating chat suggestions with Gemini:', error);
    
    // Log chi tiết lỗi nếu là lỗi từ Axios
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server trả về lỗi với status code ngoài phạm vi 2xx
        console.error('Gemini API error response:', error.response.status, error.response.data);
      } else if (error.request) {
        // Yêu cầu đã được tạo nhưng không nhận được phản hồi
        console.error('Gemini API no response received:', error.request);
      } else {
        // Có lỗi khi thiết lập yêu cầu
        console.error('Gemini API request setup error:', error.message);
      }
    }

    // Không thể kết nối với API, chuyển sang gợi ý mặc định được tạo cục bộ
    console.log('Using locally generated suggestions instead');
    return getLocalSuggestions(context);
  }
};

// Tạo gợi ý cục bộ thông minh hơn dựa trên context
const getLocalSuggestions = (context: {
  currentUser: string;
  otherUser: string;
  sharedInterests?: string[];
  isAnonymousChat?: boolean;
  messageHistory?: string[];
}): string[] => {
  const { otherUser, sharedInterests, messageHistory } = context;
  
  // Đề xuất mặc định nếu không có thông tin
  const defaultSuggestions = getDefaultSuggestions(context);
  
  // Tìm từ khóa từ tin nhắn gần đây để đưa ra gợi ý phù hợp
  if (messageHistory && messageHistory.length > 0) {
    const recentMessages = messageHistory.join(' ').toLowerCase();
    
    // Kiểm tra các từ khóa để đưa ra gợi ý phù hợp với ngữ cảnh
    if (recentMessages.includes('thời tiết')) {
      return [
        `Thời tiết ở chỗ mình hôm nay khá đẹp. Bạn hay làm gì vào những ngày đẹp trời?`,
        `Mình thích những ngày nắng ấm. Bạn thích thời tiết thế nào nhất?`,
        `Bạn có kế hoạch gì cho cuối tuần không? Dự báo thời tiết khá tốt đấy.`,
        ...defaultSuggestions.slice(0, 2)
      ];
    } 
    
    if (recentMessages.includes('game') || recentMessages.includes('play')) {
      return [
        `Ngoài trò chơi trong ứng dụng, bạn còn thích chơi game nào khác không?`,
        `Bạn có thích thể thao không? Mình nghĩ chơi thể thao cũng là một kiểu game thú vị đấy.`,
        `Hôm nào chúng ta có thể thử chơi một trò chơi khác nhé!`,
        ...defaultSuggestions.slice(0, 2)
      ];
    }
    
    // Thêm gợi ý chủ đề mới nếu đang nhàm chán
    if (messageHistory.length >= 5) {
      return [
        `Này ${otherUser}, bạn đã bao giờ thử món ẩm thực lạ nào chưa? Chia sẻ với mình món kỳ lạ nhất bạn từng ăn đi!`,
        `Bạn có kế hoạch du lịch nào trong tương lai không? Mình đang nghĩ đến việc khám phá một nơi mới.`,
        `Mình vừa xem một bộ phim hay, "${["Parasite", "Everything Everywhere All at Once", "Đào, phở và piano"][Math.floor(Math.random() * 3)]}". Bạn đã xem chưa?`,
        ...defaultSuggestions.slice(0, 2)
      ];
    }
  }

  // Nếu có sở thích chung, tạo gợi ý dựa trên đó
  if (sharedInterests && sharedInterests.length > 0) {
    const interest = sharedInterests[Math.floor(Math.random() * sharedInterests.length)];
    const interestBasedSuggestions = [
      `Mình thấy chúng ta cùng quan tâm đến ${interest}. Bạn đã quan tâm đến lĩnh vực này từ khi nào?`,
      `Về ${interest}, bạn có gợi ý gì hay để mình tìm hiểu thêm không?`,
      `Mình rất thích trò chuyện về ${interest}. Bạn có kỷ niệm đáng nhớ nào liên quan đến chủ đề này không?`
    ];
    
    // Kết hợp gợi ý dựa trên sở thích và gợi ý mặc định
    return [...interestBasedSuggestions, ...defaultSuggestions.slice(0, 2)];
  }

  return defaultSuggestions;
};

const constructPrompt = (context: {
  currentUser: string;
  otherUser: string;
  sharedInterests?: string[];
  isAnonymousChat?: boolean;
  messageHistory?: string[];
}): string => {
  const { currentUser, otherUser, sharedInterests, isAnonymousChat, messageHistory } = context;
  
  let interestsContext = '';
  if (sharedInterests && sharedInterests.length > 0) {
    interestsContext = `Họ có một số sở thích chung bao gồm: ${sharedInterests.join(', ')}.`;
  }

  let chatTypeContext = isAnonymousChat 
    ? 'Đây là một cuộc trò chuyện ẩn danh, nên cần những câu hỏi an toàn để phá băng.' 
    : 'Họ biết thông tin cơ bản về nhau và đang muốn tìm hiểu sâu hơn.';

  let historyContext = '';
  if (messageHistory && messageHistory.length > 0) {
    historyContext = `Đây là một số tin nhắn gần đây của họ:\n${messageHistory.join('\n')}\n\nDựa vào đoạn hội thoại này, hãy đề xuất các câu tiếp theo phù hợp.`;
  }

  return `
Hãy đưa ra 5 gợi ý tin nhắn cho ${currentUser} để gửi cho ${otherUser}.
${interestsContext}
${chatTypeContext}
${historyContext}

Câu gợi ý cần:
- Ngắn gọn, tự nhiên và thân thiện
- Khuyến khích đối phương chia sẻ về bản thân
- Phù hợp để bắt đầu hoặc tiếp tục cuộc trò chuyện
- Đa dạng về chủ đề (nếu có thể dựa vào sở thích chung)
- Viết bằng tiếng Việt, phù hợp với văn hóa Việt Nam
- Không quá trang trọng, giống như một người bạn hơn là email công việc

Trả lời chỉ dưới dạng một mảng JSON các chuỗi, không có định dạng thêm:
[
  "Gợi ý tin nhắn 1",
  "Gợi ý tin nhắn 2",
  "Gợi ý tin nhắn 3",
  "Gợi ý tin nhắn 4",
  "Gợi ý tin nhắn 5"
]
`;
};

const getDefaultSuggestions = (context: {
  currentUser: string;
  otherUser: string;
  sharedInterests?: string[];
  isAnonymousChat?: boolean;
}): string[] => {
  const { isAnonymousChat, sharedInterests } = context;
  
  // Default suggestions when API fails
  const defaultSuggestions = [
    "Chào bạn, hôm nay bạn có khỏe không?",
    "Bạn có sở thích gì vào cuối tuần vậy?",
    "Gần đây bạn đã xem bộ phim nào hay chưa?",
    "Bạn có thể chia sẻ về món ăn yêu thích của mình không?",
    "Hôm nay thời tiết ở chỗ bạn thế nào?"
  ];
  
  // Thêm gợi ý dựa trên sở thích chung nếu có
  if (sharedInterests && sharedInterests.length > 0) {
    const interest = sharedInterests[Math.floor(Math.random() * sharedInterests.length)];
    defaultSuggestions[1] = `Mình thấy chúng ta cùng quan tâm đến ${interest}, bạn có thể chia sẻ thêm về điều này không?`;
  }
  
  // Thay đổi gợi ý cho chat ẩn danh
  if (isAnonymousChat) {
    defaultSuggestions[0] = "Chào bạn, rất vui được trò chuyện với bạn!";
    defaultSuggestions[3] = "Bạn thích thể loại âm nhạc nào?";
  }
  
  return defaultSuggestions;
};
