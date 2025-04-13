import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import dbService from '../services/dbService';

const Navigation = () => {
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        try {
          // Get the user data from Firestore
          const userData = await dbService.getUser(firebaseUser.uid);
          setUser(userData);
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        // User is signed out
        setUser(null);
        // Redirect to login page if not already there
        if (!window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/register')) {
          navigate('/login');
        }
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await dbService.signOut();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-2' : 'bg-gradient-to-r from-indigo-700 to-purple-700 py-4'}`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link to="/" className={`text-2xl font-bold flex items-center ${scrolled ? 'text-indigo-700' : 'text-white'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
          </svg>
          ConnectApp
        </Link>
        
        {/* Mobile menu button */}
        <button 
          className={`md:hidden ${scrolled ? 'text-gray-800' : 'text-white'}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
        
        {/* Desktop navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {user && (
            <>
              <NavLink to="/" scrolled={scrolled}>Home</NavLink>
              <NavLink to="/clubs" scrolled={scrolled}>Clubs</NavLink>
              <NavLink to="/find-friends" scrolled={scrolled}>Find Friends</NavLink>
              <NavLink to="/random-match" scrolled={scrolled}>Random Match</NavLink>
              <NavLink to="/games" scrolled={scrolled}>Games</NavLink>
              <NavLink to="/chat" scrolled={scrolled}>Chat</NavLink>
              
              <div className="flex items-center ml-4">
                <div className={`flex items-center rounded-full px-2 py-1 ${scrolled ? 'bg-indigo-100' : 'bg-indigo-600'}`}>
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName} 
                    className="w-8 h-8 rounded-full border-2 border-white"
                  />
                  <span className={`ml-2 font-medium ${scrolled ? 'text-indigo-700' : 'text-white'}`}>
                    {user.displayName.split(' ')[0]}
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className={`ml-4 px-3 py-1 rounded-full ${
                    scrolled 
                      ? 'text-indigo-700 border border-indigo-700 hover:bg-indigo-700 hover:text-white' 
                      : 'text-white border border-white hover:bg-white hover:text-indigo-700'
                  } transition-colors`}
                >
                  Logout
                </button>
              </div>
            </>
          )}
          
          {!user && (
            <div className="ml-4 flex space-x-2">
              <Link to="/login">
                <button 
                  className={`px-5 py-2 rounded-full font-medium ${
                    scrolled 
                      ? 'bg-indigo-700 text-white hover:bg-indigo-800' 
                      : 'bg-white text-indigo-700 hover:bg-indigo-100'
                  } transition-colors`}
                >
                  Login
                </button>
              </Link>
              <Link to="/register">
                <button 
                  className={`px-5 py-2 rounded-full font-medium ${
                    scrolled 
                      ? 'border border-indigo-700 text-indigo-700 hover:bg-indigo-700 hover:text-white' 
                      : 'border border-white text-white hover:bg-white hover:text-indigo-700'
                  } transition-colors`}
                >
                  Register
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg rounded-b-lg mt-2 py-3 px-4 absolute left-0 right-0">
          {user && (
            <>
              <MobileNavLink to="/" onClick={() => setMobileMenuOpen(false)}>Home</MobileNavLink>
              <MobileNavLink to="/clubs" onClick={() => setMobileMenuOpen(false)}>Clubs</MobileNavLink>
              <MobileNavLink to="/find-friends" onClick={() => setMobileMenuOpen(false)}>Find Friends</MobileNavLink>
              <MobileNavLink to="/random-match" onClick={() => setMobileMenuOpen(false)}>Random Match</MobileNavLink>
              <MobileNavLink to="/games" onClick={() => setMobileMenuOpen(false)}>Games</MobileNavLink>
              <MobileNavLink to="/chat" onClick={() => setMobileMenuOpen(false)}>Chat</MobileNavLink>
              
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
                <div className="flex items-center">
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName} 
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="ml-2 text-indigo-800 font-medium">{user.displayName}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm rounded-full text-indigo-700 border border-indigo-700 hover:bg-indigo-700 hover:text-white transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          )}
          
          {!user && (
            <div className="pt-3 space-y-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full py-2 rounded-full font-medium bg-indigo-700 text-white hover:bg-indigo-800 transition-colors">
                  Login
                </button>
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full py-2 rounded-full font-medium border border-indigo-700 text-indigo-700 hover:bg-indigo-700 hover:text-white transition-colors">
                  Register
                </button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

// Desktop Nav Link component
const NavLink = ({ to, children, scrolled }: { to: string; children: React.ReactNode; scrolled: boolean }) => (
  <Link 
    to={to} 
    className={`px-3 py-2 rounded-full font-medium transition-colors ${
      scrolled 
        ? 'text-gray-800 hover:bg-gray-100' 
        : 'text-white hover:bg-indigo-600'
    }`}
  >
    {children}
  </Link>
);

// Mobile Nav Link component
const MobileNavLink = ({ to, children, onClick }: { to: string; children: React.ReactNode; onClick: () => void }) => (
  <Link 
    to={to} 
    className="block py-2 px-2 text-gray-800 hover:bg-gray-100 rounded-lg font-medium"
    onClick={onClick}
  >
    {children}
  </Link>
);

export default Navigation;