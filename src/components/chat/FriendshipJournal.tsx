import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface User {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

interface FriendshipJournalProps {
  chatId: string;
  currentUser: User;
  otherUser: User;
  onClose: () => void;
}

interface MemoryEntry {
  id?: string;
  title: string;
  description: string;
  date: Date | null;
  mood: 'happy' | 'excited' | 'nostalgic' | 'thoughtful' | null;
  tags: string[];
  createdBy: string;
  createdAt: any;
}

const FriendshipJournal: React.FC<FriendshipJournalProps> = ({
  chatId,
  currentUser,
  otherUser,
  onClose
}) => {
  const [activeView, setActiveView] = useState<'timeline' | 'add'>('timeline');
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newEntry, setNewEntry] = useState<MemoryEntry>({
    title: '',
    description: '',
    date: new Date(),
    mood: null,
    tags: [],
    createdBy: currentUser.uid,
    createdAt: null
  });
  const [tagInput, setTagInput] = useState('');
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  
  // Moods with their emojis
  const moods = [
    { value: 'happy', emoji: '😊', label: 'Happy' },
    { value: 'excited', emoji: '🎉', label: 'Excited' },
    { value: 'nostalgic', emoji: '🌙', label: 'Nostalgic' },
    { value: 'thoughtful', emoji: '💭', label: 'Thoughtful' },
  ];
  
  // Load memories from database
  useEffect(() => {
    const memoriesRef = collection(db, 'friendship_memories');
    const q = query(
      memoriesRef,
      where('chatId', '==', chatId),
      orderBy('date', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const memoryList: MemoryEntry[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        memoryList.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          date: data.date?.toDate() || null,
          mood: data.mood,
          tags: data.tags || [],
          createdBy: data.createdBy,
          createdAt: data.createdAt
        });
      });
      
      setMemories(memoryList);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching memories: ", error);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [chatId]);
  
  const handleAddTag = () => {
    if (!tagInput.trim() || newEntry.tags.includes(tagInput.trim())) return;
    
    setNewEntry({
      ...newEntry,
      tags: [...newEntry.tags, tagInput.trim()]
    });
    
    setTagInput('');
  };
  
  const handleRemoveTag = (tag: string) => {
    setNewEntry({
      ...newEntry,
      tags: newEntry.tags.filter(t => t !== tag)
    });
  };
  
  const handleSaveMemory = async () => {
    if (!newEntry.title.trim() || !newEntry.date) return;
    
    try {
      const memoryData = {
        ...newEntry,
        chatId,
        otherUserId: otherUser.uid,
        date: newEntry.date,
        createdAt: serverTimestamp()
      };
      
      if (editingMemoryId) {
        // Update existing memory
        await updateDoc(doc(db, 'friendship_memories', editingMemoryId), memoryData);
      } else {
        // Add new memory
        await addDoc(collection(db, 'friendship_memories'), memoryData);
      }
      
      // Reset form and return to timeline view
      setNewEntry({
        title: '',
        description: '',
        date: new Date(),
        mood: null,
        tags: [],
        createdBy: currentUser.uid,
        createdAt: null
      });
      
      setEditingMemoryId(null);
      setActiveView('timeline');
      
    } catch (error) {
      console.error("Error saving memory: ", error);
    }
  };
  
  const handleEditMemory = (memory: MemoryEntry) => {
    setNewEntry({
      title: memory.title,
      description: memory.description,
      date: memory.date,
      mood: memory.mood,
      tags: memory.tags,
      createdBy: memory.createdBy,
      createdAt: memory.createdAt
    });
    
    setEditingMemoryId(memory.id || null);
    setActiveView('add');
  };
  
  const handleDeleteMemory = async (memoryId: string) => {
    if (window.confirm('Are you sure you want to delete this memory?')) {
      try {
        await deleteDoc(doc(db, 'friendship_memories', memoryId));
      } catch (error) {
        console.error("Error deleting memory: ", error);
      }
    }
  };
  
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };
  
  const getMoodEmoji = (mood: string | null) => {
    if (!mood) return '';
    const foundMood = moods.find(m => m.value === mood);
    return foundMood ? foundMood.emoji : '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Friendship Journal</h2>
            <p className="text-sm text-gray-500">Memories with {otherUser.displayName || 'your friend'}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Navigation */}
        <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveView('timeline')}
              className={`px-3 py-1 text-sm rounded-md ${
                activeView === 'timeline'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'hover:bg-gray-100'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveView('add')}
              className={`px-3 py-1 text-sm rounded-md ${
                activeView === 'add'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'hover:bg-gray-100'
              }`}
            >
              {editingMemoryId ? 'Edit Memory' : 'Add Memory'}
            </button>
          </div>
          
          {activeView === 'timeline' && (
            <button
              onClick={() => {
                setNewEntry({
                  title: '',
                  description: '',
                  date: new Date(),
                  mood: null,
                  tags: [],
                  createdBy: currentUser.uid,
                  createdAt: null
                });
                setEditingMemoryId(null);
                setActiveView('add');
              }}
              className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              New Memory
            </button>
          )}
        </div>
        
        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : activeView === 'timeline' ? (
            <div>
              {memories.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4zm7 5a1 1 0 10-2 0v1H8a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No memories yet</h3>
                  <p className="text-gray-500 mb-4">Start creating memories of your friendship journey</p>
                  <button
                    onClick={() => setActiveView('add')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Add your first memory
                  </button>
                </div>
              ) : (
                <div className="space-y-8 relative before:absolute before:inset-0 before:h-full before:border-l-2 before:border-dashed before:border-gray-200 before:left-[15px] before:top-10">
                  {memories.map(memory => (
                    <div key={memory.id} className="relative flex pl-10">
                      <div className="absolute top-0 left-0 w-8 h-8 bg-white border-2 border-indigo-500 rounded-full flex items-center justify-center z-10">
                        {memory.mood ? (
                          <span>{getMoodEmoji(memory.mood)}</span>
                        ) : (
                          <span className="h-3 w-3 bg-indigo-500 rounded-full"></span>
                        )}
                      </div>
                      <div className="bg-white rounded-lg border p-4 shadow-sm w-full">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900">{memory.title}</h3>
                            <p className="text-sm text-gray-500">{formatDate(memory.date)}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditMemory(memory)}
                              className="text-gray-400 hover:text-indigo-600"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => memory.id && handleDeleteMemory(memory.id)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        <div className="mt-2">
                          <p className="text-gray-700 whitespace-pre-line">{memory.description}</p>
                        </div>
                        
                        {memory.tags && memory.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {memory.tags.map((tag, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="mt-2 text-xs text-gray-500">
                          Added by {memory.createdBy === currentUser.uid ? 'you' : 'friend'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newEntry.title}
                  onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
                  placeholder="Give this memory a title"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newEntry.date ? new Date(newEntry.date.getTime() - (newEntry.date.getTimezoneOffset() * 60000)).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : null;
                    setNewEntry({...newEntry, date});
                  }}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">How did you feel?</label>
                <div className="flex space-x-4">
                  {moods.map((mood) => (
                    <button
                      key={mood.value}
                      onClick={() => setNewEntry({...newEntry, mood: mood.value as any})}
                      className={`flex flex-col items-center p-2 rounded-md ${
                        newEntry.mood === mood.value 
                          ? 'bg-indigo-100 border-indigo-300 border' 
                          : 'hover:bg-gray-100 border border-transparent'
                      }`}
                    >
                      <span className="text-2xl">{mood.emoji}</span>
                      <span className="text-xs mt-1">{mood.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newEntry.description}
                  onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                  placeholder="What made this moment special?"
                  rows={4}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tags (e.g., funny, adventure)"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="ml-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add
                  </button>
                </div>
                
                {newEntry.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {newEntry.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 text-indigo-600 hover:text-indigo-900"
                        >
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t flex justify-between">
          {activeView === 'add' ? (
            <>
              <button
                onClick={() => {
                  setActiveView('timeline');
                  setEditingMemoryId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMemory}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                disabled={!newEntry.title.trim() || !newEntry.date}
              >
                {editingMemoryId ? 'Save Changes' : 'Save Memory'}
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Share special moments and milestones in your friendship journey
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendshipJournal;