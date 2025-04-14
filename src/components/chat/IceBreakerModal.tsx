import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

interface IceBreakerModalProps {
  onClose: () => void;
  chatId: string;
  currentUserId: string;
  otherUserName: string;
  sharedInterests: string[];
  onMessageSent: (text: string) => void;
}

const IceBreakerModal: React.FC<IceBreakerModalProps> = ({
  onClose,
  chatId,
  currentUserId,
  otherUserName,
  sharedInterests,
  onMessageSent
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
  
  // First name or "there" for greetings
  const greetingName = otherUserName ? otherUserName.split(' ')[0] : 'there';
  
  // Predefined topics to talk about
  const conversationStarters = {
    personal: [
      `Hi ${greetingName}! I'm new to this app. What brought you here?`,
      `Hey, nice to meet you! How's your day going so far?`,
      `Hello! Do you have any plans for the weekend?`
    ],
    interests: [
      `Hey ${greetingName}! I noticed we both like ${sharedInterests[0] || 'connecting with new people'}. What got you into that?`,
      `Hi there! What aspects of ${sharedInterests[0] || 'your interests'} do you enjoy most?`,
      `Hello! Have you been ${sharedInterests[0] === 'travel' ? 'traveling' : 
                             sharedInterests[0] === 'music' ? 'to any concerts' : 
                             sharedInterests[0] === 'food' ? 'trying new restaurants' : 
                             'exploring your interests'} recently?`
    ],
    funny: [
      `Quick question: if you were a breakfast food, what would you be and why? 🍳`,
      `Here's a fun one: would you rather have unlimited pizza 🍕 or unlimited ice cream 🍦 for life?`,
      `Random thought: if your life had a theme song, what would it be? 🎵`
    ],
    icebreakers: [
      `Would you rather be able to fly or be invisible? I'm curious what superpower you'd choose!`,
      `If you could travel anywhere right now, where would you go? I love hearing about dream destinations!`,
      `What's something you're looking forward to this year? I'm trying to plan some exciting things too.`
    ]
  };
  
  // Topics based on shared interests
  let interestBasedTopics: Record<string, string[]> = {};
  
  sharedInterests.forEach(interest => {
    switch (interest.toLowerCase()) {
      case 'music':
        interestBasedTopics[interest] = [
          `What kind of music do you listen to? I'm always looking for new recommendations!`,
          `Been to any good concerts lately? I'd love to hear about it!`,
          `Who are your favorite artists right now?`
        ];
        break;
      case 'travel':
        interestBasedTopics[interest] = [
          `What's the most beautiful place you've ever visited?`,
          `Do you have a dream destination you haven't been to yet?`,
          `Are you more of a beach person or mountain person when traveling?`
        ];
        break;
      case 'food':
        interestBasedTopics[interest] = [
          `What's your favorite cuisine to cook or eat?`,
          `Any restaurant recommendations in the area?`,
          `Are you more of a cook-at-home or eat-out person?`
        ];
        break;
      case 'movies':
      case 'films':
        interestBasedTopics[interest] = [
          `What's the last great movie you watched?`,
          `Do you have a favorite genre of movies?`,
          `Any recommendations for what I should watch next?`
        ];
        break;
      case 'books':
      case 'reading':
        interestBasedTopics[interest] = [
          `What are you reading right now?`,
          `Do you have a favorite author or book?`,
          `Any good book recommendations?`
        ];
        break;
      case 'sports':
        interestBasedTopics[interest] = [
          `What sports do you follow or play?`,
          `Did you catch any games recently?`,
          `Do you prefer watching or playing sports?`
        ];
        break;
      default:
        interestBasedTopics[interest] = [
          `I see we both like ${interest}! What aspects of it do you enjoy most?`,
          `How did you first get into ${interest}?`,
          `What's your favorite thing about ${interest}?`
        ];
    }
  });
  
  // Handle selecting a conversation starter
  const selectMessage = async (message: string) => {
    setIsLoading(true);
    
    try {
      // Add message to Firestore
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: currentUserId,
        text: message,
        timestamp: serverTimestamp()
      });
      
      onMessageSent(message);
      onClose();
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };
  
  // Handle sending custom message
  const sendCustomMessage = async () => {
    if (!customMessage.trim()) return;
    await selectMessage(customMessage);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center">
              <span className="mr-2">👋</span> 
              Start the Conversation
            </h2>
            <button 
              onClick={onClose} 
              className="text-white hover:text-indigo-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-indigo-100 text-sm mt-1">Let's make starting a conversation fun and easy!</p>
        </div>
        
        {/* Content */}
        <div className="p-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-600">
                First impressions matter! How would you like to break the ice with <span className="font-semibold">{otherUserName}</span>?
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => { setSelectedTopic('personal'); setStep(2); }}
                  className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                >
                  <span className="text-2xl mb-2">👋</span>
                  <span className="text-sm font-medium">Friendly Hello</span>
                </button>
                
                {sharedInterests.length > 0 && (
                  <button 
                    onClick={() => { setSelectedTopic('interests'); setStep(2); }}
                    className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                  >
                    <span className="text-2xl mb-2">❤️</span>
                    <span className="text-sm font-medium">Shared Interests</span>
                  </button>
                )}
                
                <button 
                  onClick={() => { setSelectedTopic('funny'); setStep(2); }}
                  className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                >
                  <span className="text-2xl mb-2">😂</span>
                  <span className="text-sm font-medium">Fun Question</span>
                </button>
                
                <button 
                  onClick={() => { setSelectedTopic('icebreakers'); setStep(2); }}
                  className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                >
                  <span className="text-2xl mb-2">💬</span>
                  <span className="text-sm font-medium">Conversation Starter</span>
                </button>
                
                {Object.keys(interestBasedTopics).length > 0 && (
                  <button 
                    onClick={() => setStep(3)}
                    className="flex flex-col items-center justify-center p-4 border border-indigo-200 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors col-span-2"
                  >
                    <span className="text-2xl mb-2">🔍</span>
                    <span className="text-sm font-medium">Ask About Specific Interest</span>
                  </button>
                )}
                
                <button 
                  onClick={() => setStep(4)}
                  className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors col-span-2"
                >
                  <span className="text-2xl mb-2">✏️</span>
                  <span className="text-sm font-medium">Write Your Own Message</span>
                </button>
              </div>
            </div>
          )}
          
          {step === 2 && selectedTopic && (
            <div className="space-y-4">
              <button 
                onClick={() => setStep(1)} 
                className="flex items-center text-indigo-600 hover:text-indigo-800 mb-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              
              <h3 className="font-medium text-gray-800">
                {selectedTopic === 'personal' && 'Start with a friendly hello'}
                {selectedTopic === 'interests' && 'Start with shared interests'}
                {selectedTopic === 'funny' && 'Start with something fun'}
                {selectedTopic === 'icebreakers' && 'Start with an icebreaker'}
              </h3>
              
              <div className="space-y-2">
                {conversationStarters[selectedTopic as keyof typeof conversationStarters].map((starter, index) => (
                  <button
                    key={index}
                    onClick={() => selectMessage(starter)}
                    disabled={isLoading}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {step === 3 && (
            <div className="space-y-4">
              <button 
                onClick={() => setStep(1)} 
                className="flex items-center text-indigo-600 hover:text-indigo-800 mb-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              
              <h3 className="font-medium text-gray-800">Which interest would you like to talk about?</h3>
              
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(interestBasedTopics).map((interest) => (
                  <button
                    key={interest}
                    onClick={() => { setSelectedInterest(interest); setStep(5); }}
                    className={`p-2 border rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors ${
                      selectedInterest === interest ? 'bg-indigo-100 border-indigo-300' : 'border-gray-200'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {step === 4 && (
            <div className="space-y-4">
              <button 
                onClick={() => setStep(1)} 
                className="flex items-center text-indigo-600 hover:text-indigo-800 mb-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              
              <h3 className="font-medium text-gray-800">Write your own message</h3>
              
              <div>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={`Hi ${greetingName}! Nice to meet you...`}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={4}
                />
              </div>
              
              <button
                onClick={sendCustomMessage}
                disabled={isLoading || !customMessage.trim()}
                className={`w-full py-2 rounded-lg ${
                  isLoading || !customMessage.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                } transition-colors`}
              >
                {isLoading ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          )}
          
          {step === 5 && selectedInterest && (
            <div className="space-y-4">
              <button 
                onClick={() => setStep(3)} 
                className="flex items-center text-indigo-600 hover:text-indigo-800 mb-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              
              <h3 className="font-medium text-gray-800">Talk about {selectedInterest}</h3>
              
              <div className="space-y-2">
                {interestBasedTopics[selectedInterest].map((starter, index) => (
                  <button
                    key={index}
                    onClick={() => selectMessage(starter)}
                    disabled={isLoading}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="bg-indigo-100 text-indigo-800 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="ml-2 text-xs text-gray-600">
              Starting a conversation can be tough. Our suggestions help break the ice and make the process more comfortable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IceBreakerModal;