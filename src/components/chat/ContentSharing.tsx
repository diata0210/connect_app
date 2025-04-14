import React, { useState } from 'react';
import { db, storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

interface User {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

interface ContentSharingProps {
  chatId: string;
  currentUser: User;
  otherUser: User;
  onClose: () => void;
}

const ContentSharing: React.FC<ContentSharingProps> = ({
  chatId,
  currentUser,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'media' | 'poll' | 'meme' | 'recommend'>('media');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress] = useState(0);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [recommendationType, setRecommendationType] = useState<'movie' | 'music' | 'book'>('movie');
  const [recommendation, setRecommendation] = useState('');
  
  const popularMemes = [
    { id: '1', src: 'https://i.imgur.com/KLLX1Bf.png', alt: 'Awkward moment meme' },
    { id: '2', src: 'https://i.imgur.com/lNxAaeK.png', alt: 'Thinking face meme' },
    { id: '3', src: 'https://i.imgur.com/4CEGQnv.png', alt: 'Success meme' },
    { id: '4', src: 'https://i.imgur.com/j1LrgMP.png', alt: 'Confused meme' },
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setUploading(true);
      const storageRef = ref(storage, `chat_images/${chatId}/${Date.now()}_${file.name}`);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Add as message to chat
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: currentUser.uid,
        text: '📷 Shared an image',
        mediaUrl: downloadURL,
        mediaType: 'image',
        timestamp: serverTimestamp()
      });
      
      setUploading(false);
      onClose();
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploading(false);
    }
  };
  
  const handlePollCreate = async () => {
    if (!pollQuestion.trim() || pollOptions.filter(opt => opt.trim()).length < 2) return;
    
    try {
      // Filter out empty options
      const validOptions = pollOptions.filter(opt => opt.trim());
      
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: currentUser.uid,
        text: `📊 Poll: ${pollQuestion}`,
        type: 'poll',
        pollData: {
          question: pollQuestion,
          options: validOptions.map(option => ({
            text: option,
            votes: [] // will store user IDs who voted
          })),
          createdAt: serverTimestamp()
        },
        timestamp: serverTimestamp()
      });
      
      onClose();
    } catch (error) {
      console.error('Error creating poll:', error);
    }
  };
  
  const addPollOption = () => {
    setPollOptions([...pollOptions, '']);
  };
  
  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };
  
  const removePollOption = (index: number) => {
    if (pollOptions.length <= 2) return; // Keep at least two options
    const newOptions = [...pollOptions];
    newOptions.splice(index, 1);
    setPollOptions(newOptions);
  };
  
  const handleMemeShare = async (meme: {id: string, src: string, alt: string}) => {
    try {
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: currentUser.uid,
        text: '😂 Shared a meme',
        mediaUrl: meme.src,
        mediaType: 'meme',
        mediaAlt: meme.alt,
        timestamp: serverTimestamp()
      });
      
      onClose();
    } catch (error) {
      console.error('Error sharing meme:', error);
    }
  };
  
  const handleRecommendationShare = async () => {
    if (!recommendation.trim()) return;
    
    try {
      let emoji = '🎬';
      if (recommendationType === 'music') emoji = '🎵';
      if (recommendationType === 'book') emoji = '📚';
      
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: currentUser.uid,
        text: `${emoji} Recommended a ${recommendationType}: ${recommendation}`,
        type: 'recommendation',
        recommendationData: {
          type: recommendationType,
          title: recommendation
        },
        timestamp: serverTimestamp()
      });
      
      onClose();
    } catch (error) {
      console.error('Error sharing recommendation:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Share Content</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Tab navigation */}
        <div className="flex border-b">
          <button 
            className={`flex-1 py-3 text-center ${activeTab === 'media' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('media')}
          >
            🖼️ Media
          </button>
          <button 
            className={`flex-1 py-3 text-center ${activeTab === 'poll' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('poll')}
          >
            📊 Poll
          </button>
          <button 
            className={`flex-1 py-3 text-center ${activeTab === 'meme' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('meme')}
          >
            😂 Memes
          </button>
          <button 
            className={`flex-1 py-3 text-center ${activeTab === 'recommend' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('recommend')}
          >
            🎬 Recommend
          </button>
        </div>
        
        {/* Content area */}
        <div className="p-6">
          {/* Media tab */}
          {activeTab === 'media' && (
            <div>
              <p className="text-gray-600 mb-4">Share photos to enhance your conversation</p>
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">
                    Click to upload an image
                  </p>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>
              </label>
              
              {uploading && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Uploading...</p>
                </div>
              )}
            </div>
          )}
          
          {/* Poll tab */}
          {activeTab === 'poll' && (
            <div>
              <p className="text-gray-600 mb-4">Create a poll to get feedback from your friend</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Question</label>
                  <input 
                    type="text" 
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="Ask a question..."
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex items-center mb-2">
                      <input 
                        type="text" 
                        value={option}
                        onChange={(e) => updatePollOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {pollOptions.length > 2 && (
                        <button 
                          onClick={() => removePollOption(index)}
                          className="ml-2 text-gray-500 hover:text-red-500"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button 
                    onClick={addPollOption}
                    className="mt-2 flex items-center text-indigo-600 hover:text-indigo-700 text-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    Add Option
                  </button>
                </div>
              </div>
              
              <button 
                onClick={handlePollCreate}
                className="w-full mt-6 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={!pollQuestion.trim() || pollOptions.filter(opt => opt.trim()).length < 2}
              >
                Create Poll
              </button>
            </div>
          )}
          
          {/* Meme tab */}
          {activeTab === 'meme' && (
            <div>
              <p className="text-gray-600 mb-4">Share a fun meme to lighten the mood</p>
              
              <div className="grid grid-cols-2 gap-4">
                {popularMemes.map(meme => (
                  <div 
                    key={meme.id} 
                    className="border rounded-md overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleMemeShare(meme)}
                  >
                    <img src={meme.src} alt={meme.alt} className="w-full h-32 object-cover" />
                    <div className="p-2 text-xs text-center text-gray-500">{meme.alt}</div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 text-center text-sm text-gray-500">
                Click on a meme to share it instantly
              </div>
            </div>
          )}
          
          {/* Recommendation tab */}
          {activeTab === 'recommend' && (
            <div>
              <p className="text-gray-600 mb-4">Recommend something to your friend</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <div className="mt-2 flex space-x-2">
                    <button 
                      className={`flex-1 py-2 px-4 border rounded-md ${recommendationType === 'movie' ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'border-gray-300'}`}
                      onClick={() => setRecommendationType('movie')}
                    >
                      🎬 Movie
                    </button>
                    <button 
                      className={`flex-1 py-2 px-4 border rounded-md ${recommendationType === 'music' ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'border-gray-300'}`}
                      onClick={() => setRecommendationType('music')}
                    >
                      🎵 Music
                    </button>
                    <button 
                      className={`flex-1 py-2 px-4 border rounded-md ${recommendationType === 'book' ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'border-gray-300'}`}
                      onClick={() => setRecommendationType('book')}
                    >
                      📚 Book
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input 
                    type="text" 
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                    placeholder={`Enter ${recommendationType} title...`}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <button 
                onClick={handleRecommendationShare}
                className="w-full mt-6 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={!recommendation.trim()}
              >
                Share Recommendation
              </button>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t">
          <p className="text-sm text-gray-500">
            Shared content will be visible in the chat history.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContentSharing;