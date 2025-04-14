import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FriendRecommendations from '../components/FriendRecommendations';
import dbService, { User, Club } from '../services/dbService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [popularClubs, setPopularClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Use Firebase authentication to get the current user
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, fetch user data from Firestore
        try {
          const userData = await dbService.getUser(firebaseUser.uid);
          setUser(userData);
        } catch (error) {
          console.error('Error fetching current user:', error);
        }
      } else {
        // User is not signed in but we allow them to stay on the home page
        setUser(null);
        // Remove the redirect to login
      }
    });

    return () => unsubscribe(); // Clean up the subscription
  }, [navigate]);

  // Fetch popular clubs from the database
  useEffect(() => {
    const fetchPopularClubs = async () => {
      try {
        const clubs = await dbService.getAllClubs();
        // Sort clubs by member count and get top 3
        const topClubs = [...clubs]
          .sort((a, b) => b.memberCount - a.memberCount)
          .slice(0, 3);
          
        setPopularClubs(topClubs);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching clubs:', error);
        setLoading(false);
      }
    };

    fetchPopularClubs();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4 text-center relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
            <svg className="absolute top-0 left-1/4 w-48 h-48 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 10a1 1 0 10-2 0 8 8 0 0016 0 1 1 0 10-2 0 5.986 5.986 0 00-.454 2.916A5 5 0 008 11z" clipRule="evenodd"></path>
            </svg>
            <svg className="absolute bottom-0 right-1/4 w-64 h-64 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path>
            </svg>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight leading-tight">
            Connect with people who <span className="text-pink-300">share your interests</span>
          </h1>
          <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto">
            Join clubs, find new friends, and chat with people who love what you love. Building meaningful connections has never been easier.
          </p>
          
          {/* Only show these buttons when user is logged in */}
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link to="/random-match" className="group relative px-8 py-4 overflow-hidden rounded-full bg-white text-indigo-700 text-lg font-medium shadow-lg hover:scale-105 transition-transform duration-300">
              <span className="relative z-10">Find a Match</span>
              <div className="absolute inset-0 h-full w-full scale-0 rounded-full bg-indigo-100 transition-all duration-300 group-hover:scale-100"></div>
            </Link>
            <Link to="/clubs" className="group relative px-8 py-4 overflow-hidden rounded-full bg-transparent border-2 border-white text-white text-lg font-medium hover:scale-105 transition-transform duration-300">
              <span className="relative z-10">Browse Clubs</span>
              <div className="absolute inset-0 h-full w-full scale-0 rounded-full bg-white/10 transition-all duration-300 group-hover:scale-100"></div>
            </Link>
          </div>
          
          <div className="hidden md:block absolute -bottom-16 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-3">
              <div className="w-3 h-3 rounded-full bg-pink-500 animate-bounce"></div>
              <div className="w-3 h-3 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-3 h-3 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24">
        {user && (
          <div className="mb-16">
            <FriendRecommendations currentUserId={user.uid} maxRecommendations={3} />
          </div>
        )}
        
        {/* Features Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-800 mb-12 text-center">How ConnectApp Works</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              title="Join Clubs"
              description="Find and join clubs based on your interests. Discuss your passions with like-minded people."
              linkText="Browse Clubs"
              linkUrl="/clubs"
            />
            
            <FeatureCard 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
              title="Find Friends"
              description="Discover people who share your interests and connect with like-minded individuals."
              linkText="Find Friends"
              linkUrl="/find-friends"
            />
            
            <FeatureCard 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              }
              title="Random Matching"
              description="Get connected with random users who share similar interests and make new friends."
              linkText="Find a Match"
              linkUrl="/random-match"
            />
            
            <FeatureCard 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
              title="Chat With Friends"
              description="Connect through our real-time chat system and build meaningful relationships."
              linkText="Start Chatting"
              linkUrl="/chat"
            />
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Popular Clubs</h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-12 h-12 border-t-4 border-indigo-600 border-solid rounded-full animate-spin"></div>
            </div>
          ) : popularClubs.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {popularClubs.map((club) => (
                <div key={club.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-3 py-1 rounded-full">
                        {club.category}
                      </span>
                      <span className="flex items-center text-gray-500 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                        </svg>
                        {club.memberCount}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{club.name}</h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">{club.description}</p>
                    <Link 
                      to={`/clubs/${club.id}`} 
                      className="inline-flex items-center text-indigo-600 font-medium hover:text-indigo-500"
                    >
                      View Club
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-600 mb-4">No clubs available yet. Be the first to create one!</p>
            </div>
          )}
          
          <div className="mt-10 text-center">
            <Link 
              to="/clubs" 
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-indigo-600 text-white font-medium shadow-md hover:bg-indigo-700 transition-colors"
            >
              View All Clubs
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Call to action section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16 mt-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to explore more?</h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Find your next connection with like-minded people on ConnectApp.
          </p>
          
          <Link 
            to="/random-match" 
            className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-white text-indigo-700 font-medium shadow-lg hover:bg-indigo-50 transition-colors"
          >
            Find Your Match
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  linkText, 
  linkUrl 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  linkText: string; 
  linkUrl: string; 
}) => (
  <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
    <div className="text-indigo-600 mb-4">{icon}</div>
    <h3 className="text-xl font-bold text-gray-800 mb-3">{title}</h3>
    <p className="text-gray-600 mb-4">{description}</p>
    <Link to={linkUrl} className="text-indigo-600 font-medium hover:text-indigo-500 inline-flex items-center">
      {linkText}
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </Link>
  </div>
);

export default Home;