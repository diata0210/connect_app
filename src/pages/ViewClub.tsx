import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import dbService, { Club, User } from '../services/dbService';

const ViewClub = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication and get current user
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const user = await dbService.getUser(firebaseUser.uid);
          setCurrentUser(user);
        } catch (err) {
          console.error('Error fetching user:', err);
        }
      } else {
        // Redirect to login if not authenticated
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    // Fetch club details and members when clubId or currentUser changes
    const fetchClubDetails = async () => {
      if (!clubId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Get club details
        const clubData = await dbService.getClub(clubId);
        
        if (!clubData) {
          setError('Club not found');
          setLoading(false);
          return;
        }
        
        setClub(clubData);

        // Check if current user is club creator
        if (currentUser && clubData.createdBy === currentUser.uid) {
          setIsCreator(true);
        }

        // Get club members
        try {
          const membersData = await dbService.getClubMembers(clubId);
          setMembers(membersData);
          
          // Check if current user is a member
          if (currentUser) {
            setIsMember(membersData.some(member => member.uid === currentUser.uid));
          }
        } catch (err) {
          console.error('Error fetching club members:', err);
        }
        
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Error fetching club details');
        setLoading(false);
      }
    };

    if (clubId && currentUser) {
      fetchClubDetails();
    }
  }, [clubId, currentUser]);

  const handleJoinClub = async () => {
    if (!clubId || !currentUser) return;
    
    setJoinLoading(true);
    try {
      await dbService.joinClub(clubId, currentUser.uid);
      setIsMember(true);
      
      // Update the club and members list
      const updatedClub = await dbService.getClub(clubId);
      if (updatedClub) setClub(updatedClub);
      
      const updatedMembers = await dbService.getClubMembers(clubId);
      setMembers(updatedMembers);
      
      setJoinLoading(false);
    } catch (err: any) {
      console.error('Error joining club:', err);
      setJoinLoading(false);
    }
  };

  const handleLeaveClub = async () => {
    if (!clubId || !currentUser) return;
    
    setJoinLoading(true);
    try {
      await dbService.leaveClub(clubId, currentUser.uid);
      setIsMember(false);
      
      // Update the club and members list
      const updatedClub = await dbService.getClub(clubId);
      if (updatedClub) setClub(updatedClub);
      
      const updatedMembers = await dbService.getClubMembers(clubId);
      setMembers(updatedMembers);
      
      setJoinLoading(false);
    } catch (err: any) {
      console.error('Error leaving club:', err);
      setJoinLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-red-600 text-center text-xl">
              {error || 'Club not found'}
            </div>
            <div className="mt-6 text-center">
              <Link
                to="/clubs"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Back to Clubs
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Club Header */}
          <div className="bg-gradient-to-r from-indigo-700 to-purple-700 p-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2">{club.name}</h1>
                <div className="inline-block bg-white/20 text-sm px-3 py-1 rounded-full">
                  {club.category}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm">Created by</div>
                {members.find(m => m.uid === club.createdBy) && (
                  <div className="flex items-center justify-end mt-1">
                    <img
                      src={members.find(m => m.uid === club.createdBy)?.photoURL}
                      alt="Creator"
                      className="w-6 h-6 rounded-full mr-2"
                    />
                    <span>{members.find(m => m.uid === club.createdBy)?.displayName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Club Content */}
          <div className="p-8">
            {/* Club Actions */}
            <div className="mb-8 flex justify-between items-center">
              <div className="flex items-center">
                <div className="bg-indigo-100 text-indigo-800 rounded-full px-3 py-1 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  <span>{club.memberCount} members</span>
                </div>
                <span className="mx-2 text-gray-400">•</span>
                <span className="text-gray-500 text-sm">
                  Created on {new Date(club.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              {!isCreator && (
                <div>
                  {isMember ? (
                    <button
                      onClick={handleLeaveClub}
                      disabled={joinLoading}
                      className="px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-50"
                    >
                      {joinLoading ? 'Leaving...' : 'Leave Club'}
                    </button>
                  ) : (
                    <button
                      onClick={handleJoinClub}
                      disabled={joinLoading}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      {joinLoading ? 'Joining...' : 'Join Club'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Club Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">About</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{club.description}</p>
            </div>
            
            {/* Members Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Members</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {members.map(member => (
                  <div key={member.uid} className="flex items-center p-2 rounded-lg hover:bg-gray-50">
                    <img
                      src={member.photoURL}
                      alt={member.displayName}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-800">
                        {member.displayName}
                        {member.uid === club.createdBy && (
                          <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                            Creator
                          </span>
                        )}
                      </div>
                      {/* Show interests in common */}
                      {currentUser && member.uid !== currentUser.uid && member.interests && currentUser.interests && (
                        <div className="text-xs text-gray-500">
                          {member.interests.filter(interest => 
                            currentUser.interests?.includes(interest)
                          ).length} interests in common
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Footer with Back Button */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between">
            <Link
              to="/clubs"
              className="flex items-center text-indigo-600 hover:text-indigo-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Clubs
            </Link>
            
            {/* Add more actions here if needed */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewClub;