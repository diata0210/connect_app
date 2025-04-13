import React, { useState, useEffect } from 'react';
import dbService, { User } from '../services/dbService';

interface FriendRecommendationsProps {
  currentUserId: string;
  maxRecommendations?: number;
}

const FriendRecommendations: React.FC<FriendRecommendationsProps> = ({ 
  currentUserId, 
  maxRecommendations = 3 
}) => {
  const [recommendations, setRecommendations] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  useEffect(() => {
    // Fetch current user
    const fetchCurrentUser = async () => {
      try {
        const user = await dbService.getUser(currentUserId);
        if (user) {
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    fetchCurrentUser();
  }, [currentUserId]);
  
  useEffect(() => {
    // Only fetch recommendations once we have current user
    if (!currentUser) return;
    
    // Fetch friend recommendations from the database
    const fetchRecommendations = async () => {
      try {
        const recommendedUsers = await dbService.getFriendRecommendations(currentUser.uid, maxRecommendations);
        setRecommendations(recommendedUsers);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [currentUser, maxRecommendations]);
  
  const handleAddFriend = (userId: string) => {
    // In a real app, this would call an API to send a friend request
    console.log(`Friend request sent to user ${userId}`);
    // Remove from recommendations after sending request
    setRecommendations(recommendations.filter(user => user.uid !== userId));
    alert('Friend request sent!');
  };
  
  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-800 mb-4">People You May Know</h2>
        <p className="text-gray-500">Loading recommendations...</p>
      </div>
    );
  }
  
  if (recommendations.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-800 mb-4">People You May Know</h2>
        <p className="text-gray-500">No recommendations at this time.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-gray-800 mb-4">People You May Know</h2>
      <p className="text-sm text-gray-600 mb-4">Based on common interests</p>
      
      <div className="space-y-4">
        {recommendations.map((user: any) => (
          <div key={user.uid} className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center space-x-3">
              <img 
                src={user.photoURL} 
                alt={user.displayName} 
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h3 className="font-semibold text-gray-800">{user.displayName}</h3>
                <p className="text-sm text-gray-600">
                  {user.commonInterests && user.commonInterests.slice(0, 3).join(', ')}
                  {user.commonInterests && user.commonInterests.length > 3 && '...'}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleAddFriend(user.uid)}
              className="bg-indigo-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-indigo-500 transition-colors"
            >
              Connect
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendRecommendations;