import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FriendRecommendations from '../components/FriendRecommendations';
import dbService, { User } from '../services/dbService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false); // Thêm biến này
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
        // User is not signed in, redirect to login
        setUser(null);
        navigate('/login');
      }
      setAuthChecked(true); // Đánh dấu đã check xong auth
    });

    return () => unsubscribe(); // Clean up the subscription
  }, [navigate]);

  // Fetch popular clubs from the database

  if (!authChecked) {
    // Hiển thị skeleton hoặc loading để tránh flash header chưa login
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="animate-pulse text-2xl text-indigo-400 font-bold">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 pt-28 pb-20 md:pt-36 md:pb-28 relative shadow-xl rounded-b-3xl">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
            <svg className="absolute top-0 left-1/4 w-64 h-64 text-white" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" fill="white" fillOpacity="0.2" />
            </svg>
            <svg className="absolute bottom-0 right-1/4 w-80 h-80 text-white" fill="currentColor" viewBox="0 0 20 20">
              <rect width="20" height="20" rx="10" fill="white" fillOpacity="0.15" />
            </svg>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-8 tracking-tight leading-tight drop-shadow-lg">
            Kết nối với những người <span className="text-pink-300 animate-pulse">chung sở thích</span>
          </h1>
          <p className="text-2xl text-indigo-100 mb-12 max-w-3xl mx-auto font-medium drop-shadow">
            Tham gia club, tìm bạn mới, trò chuyện với những người cùng đam mê. Kết nối ý nghĩa chưa bao giờ dễ dàng đến thế.
          </p>
          {/* Only show these buttons when user is logged in */}
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-8">
            <Link to="/random-match" className="group relative px-10 py-5 overflow-hidden rounded-full bg-white text-indigo-700 text-xl font-semibold shadow-2xl hover:scale-105 hover:bg-indigo-50 transition-all duration-300">
              <span className="relative z-10">Tìm bạn ghép đôi</span>
              <div className="absolute inset-0 h-full w-full scale-0 rounded-full bg-indigo-100 transition-all duration-300 group-hover:scale-100"></div>
            </Link>
          </div>
          <div className="hidden md:block absolute -bottom-16 left-1/2 transform -translate-x-1/2 z-20">
            <div className="flex space-x-3">
              <div className="w-4 h-4 rounded-full bg-pink-400 animate-bounce"></div>
              <div className="w-4 h-4 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-4 h-4 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-20 md:py-28">
        {user && (
          <div className="mb-20">
            <FriendRecommendations currentUserId={user.uid} maxRecommendations={3} />
          </div>
        )}
        {/* Features Section */}
        <div className="mb-24">
          <h2 className="text-4xl font-extrabold text-gray-800 mb-14 text-center tracking-tight">ConnectApp có gì hay?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
            <FeatureCard 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              }
              title="Ghép đôi ngẫu nhiên"
              description="Kết nối với người lạ cùng sở thích, mở rộng mối quan hệ và tìm bạn mới mỗi ngày."
              linkText="Tìm bạn ghép đôi"
              linkUrl="/random-match"
            />
            <FeatureCard 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
              title="Trò chuyện kết bạn"
              description="Chat realtime, chia sẻ cảm xúc, xây dựng tình bạn bền lâu qua các cuộc trò chuyện thú vị."
              linkText="Bắt đầu chat"
              linkUrl="/chat"
            />
          </div>
        </div>
      </div>
      {/* Call to action section */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 py-20 mt-20 rounded-t-3xl shadow-2xl">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-8 drop-shadow">Sẵn sàng khám phá thêm?</h2>
          <p className="text-2xl text-indigo-100 mb-10 max-w-2xl mx-auto font-medium">
            Tìm kiếm kết nối mới với những người cùng chí hướng trên ConnectApp.
          </p>
          <Link 
            to="/random-match" 
            className="inline-flex items-center justify-center px-10 py-4 rounded-full bg-white text-indigo-700 font-semibold text-xl shadow-xl hover:bg-indigo-50 hover:scale-105 transition-all duration-300"
          >
            Tìm bạn ghép đôi
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2" viewBox="0 0 20 20" fill="currentColor">
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
  <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-indigo-50 hover:-translate-y-2 group cursor-pointer">
    <div className="text-indigo-600 mb-6 group-hover:scale-110 transition-transform duration-300">{icon}</div>
    <h3 className="text-2xl font-bold text-gray-800 mb-4 group-hover:text-indigo-700 transition-colors duration-300">{title}</h3>
    <p className="text-gray-600 mb-6 min-h-[60px]">{description}</p>
    <Link to={linkUrl} className="text-indigo-600 font-semibold hover:text-pink-500 inline-flex items-center text-lg transition-colors duration-200">
      {linkText}
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </Link>
  </div>
);

export default Home;