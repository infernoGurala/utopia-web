import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { themes } from '../theme/themes';
import { 
  doc, updateDoc, collection, getDocs, getDoc, 
  query, where, onSnapshot, deleteDoc, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { 
  User, Settings, Shield, Bell, Palette, CheckCircle2, 
  Menu, X, Plus, Search, Bookmark, Grid, Heart, Upload, 
  LogOut, Share2, Award, Mail, MessageSquare, Tag, Eye
} from 'lucide-react';

const DEFAULT_BIO = `I'm slave of freedom 🕊️
I love a losing game
i can draw objects,anime,people and someone i can't have`;
const DEFAULT_NAME = 'Mahesh';
const DEFAULT_USERNAME = 'lord_.destroyer';

const initialFollowers = [
  { uid: 's1', displayName: 'Aravind Sharma', email: 'aravind@university.edu', username: 'aravind_maths', bio: 'Maths Lead. Calculus lover.' },
  { uid: 's2', displayName: 'Sarah Miller', email: 'sarah.m@university.edu', username: 'sarah_phys', bio: 'Physics Tutor. Quantum mechanics enthusiast.' },
  { uid: 's3', displayName: 'James Chen', email: 'j.chen@university.edu', username: 'james_code', bio: 'CS Secretary. React developer.' },
  { uid: 's5', displayName: 'Emily Watson', email: 'emily@university.edu', username: 'emily_reads', bio: 'Literature student. Bibliophile.' },
  { uid: 's6', displayName: 'Daniel Kim', email: 'daniel@university.edu', username: 'dan_k', bio: 'Bioengineering major. Gym rat.' },
  { uid: 's7', displayName: 'Sophia Martinez', email: 'sophia@university.edu', username: 'sophia_m', bio: 'Graphic design student. Art is life.' },
];

const initialFollowing = [
  { uid: 's1', displayName: 'Aravind Sharma', email: 'aravind@university.edu', username: 'aravind_maths', bio: 'Maths Lead. Calculus lover.' },
  { uid: 's2', displayName: 'Sarah Miller', email: 'sarah.m@university.edu', username: 'sarah_phys', bio: 'Physics Tutor. Quantum mechanics enthusiast.' },
  { uid: 's3', displayName: 'James Chen', email: 'j.chen@university.edu', username: 'james_code', bio: 'CS Secretary. React developer.' },
  { uid: 's8', displayName: 'David Wilson', email: 'david@university.edu', username: 'david_w', bio: 'Chemistry student. Experimenting.' },
  { uid: 's9', displayName: 'Olivia Taylor', email: 'olivia@university.edu', username: 'olivia_t', bio: 'History major. Time traveler.' },
];

const mockStudents = [
  ...initialFollowers,
  ...initialFollowing,
  { uid: 's10', displayName: 'Liam Davies', email: 'liam@university.edu', username: 'liam_d', bio: 'Mechanical engineer. Car enthusiast.' },
  { uid: 's11', displayName: 'Chloe Smith', email: 'chloe@university.edu', username: 'chloe_s', bio: 'Business major. Entrepreneur mindset.' }
];

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { currentThemeId, changeTheme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Profile data states
  const [displayName, setDisplayName] = useState(DEFAULT_NAME);
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [bio, setBio] = useState(DEFAULT_BIO);
  const [customAvatar, setCustomAvatar] = useState(null);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [classesCount, setClassesCount] = useState(0);
  const [userClasses, setUserClasses] = useState([]);

  // Follow states from Firestore
  const [sentFollowsList, setSentFollowsList] = useState([]);
  const [isFollowRequestsModalOpen, setIsFollowRequestsModalOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);

  // UI state toggles
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  
  // View user profile modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Settings views active sub-screens
  const [updatingTheme, setUpdatingTheme] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('main'); // 'main', 'theme', 'account', 'notifications', 'privacy'

  // Tab navigation inside profile
  const [activeProfileTab, setActiveProfileTab] = useState('grid'); // 'grid', 'saved', 'tagged'

  // Highlights state
  const [highlights, setHighlights] = useState([
    { id: 'h1', name: 'Peak anime', gradient: 'from-pink-500 via-red-500 to-yellow-500', img: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80' }
  ]);
  const [showHighlightViewer, setShowHighlightViewer] = useState(null);
  const [showNewHighlightModal, setShowNewHighlightModal] = useState(false);
  const [newHighlightName, setNewHighlightName] = useState('');

  // Local temp fields for edits
  const [editNameInput, setEditNameInput] = useState('');
  const [editUsernameInput, setEditUsernameInput] = useState('');
  const [editBioInput, setEditBioInput] = useState('');

  useEffect(() => {
    if (!user) return;

    // Load custom profile bio/data from LocalStorage
    const savedData = localStorage.getItem('profile_data_' + user.uid);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setDisplayName(parsed.displayName || user.displayName || DEFAULT_NAME);
        setUsername(parsed.username || DEFAULT_USERNAME);
        setBio(parsed.bio !== undefined ? parsed.bio : DEFAULT_BIO);
      } catch (e) {
        console.error(e);
      }
    } else {
      setDisplayName(user.displayName || DEFAULT_NAME);
      setUsername(DEFAULT_USERNAME);
      setBio(DEFAULT_BIO);
    }

    // Load custom avatar
    const savedAvatar = localStorage.getItem('custom_avatar_' + user.uid);
    if (savedAvatar) {
      setCustomAvatar(savedAvatar);
    }

    // Fetch user details helper
    const fetchUsersByUids = async (uids) => {
      if (!uids || uids.length === 0) return [];
      try {
        const userDocs = await Promise.all(
          uids.map(async (uid) => {
            const userDocSnap = await getDoc(doc(db, 'users', uid));
            if (userDocSnap.exists()) {
              return {
                uid,
                ...userDocSnap.data()
              };
            } else {
              // Fallback to mockStudents/default
              const mock = mockStudents.find(m => m.uid === uid);
              return mock || {
                uid,
                displayName: 'Campus Classmate',
                username: 'student',
                bio: '',
                email: ''
              };
            }
          })
        );
        return userDocs;
      } catch (err) {
        console.warn("Error fetching users by uids:", err);
        return [];
      }
    };

    // Listen to follows where user is being followed (accepted) -> followers
    const followersQuery = query(
      collection(db, 'follows'),
      where('followingId', '==', user.uid),
      where('status', '==', 'accepted')
    );
    const unsubFollowers = onSnapshot(followersQuery, async (snapshot) => {
      const uids = snapshot.docs.map(doc => doc.data().followerId);
      const list = await fetchUsersByUids(uids);
      setFollowersList(list);
    });

    // Listen to follows where user is following (accepted) -> following
    const followingQuery = query(
      collection(db, 'follows'),
      where('followerId', '==', user.uid),
      where('status', '==', 'accepted')
    );
    const unsubFollowing = onSnapshot(followingQuery, async (snapshot) => {
      const uids = snapshot.docs.map(doc => doc.data().followingId);
      const list = await fetchUsersByUids(uids);
      setFollowingList(list);
    });

    // Listen to follows sent by current user (for search results checks)
    const sentFollowsQuery = query(
      collection(db, 'follows'),
      where('followerId', '==', user.uid)
    );
    const unsubSentFollows = onSnapshot(sentFollowsQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        followingId: doc.data().followingId,
        status: doc.data().status
      }));
      setSentFollowsList(list);
    });

    // Listen to incoming pending follow requests
    const requestsQuery = query(
      collection(db, 'follows'),
      where('followingId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubRequests = onSnapshot(requestsQuery, async (snapshot) => {
      const requestsData = snapshot.docs.map(docSnap => ({
        requestDocId: docSnap.id,
        uid: docSnap.data().followerId
      }));
      
      const uids = requestsData.map(r => r.uid);
      const usersInfo = await fetchUsersByUids(uids);
      
      const list = requestsData.map(r => {
        const userInfo = usersInfo.find(u => u.uid === r.uid) || {};
        return {
          requestDocId: r.requestDocId,
          uid: r.uid,
          displayName: userInfo.displayName || 'Campus Classmate',
          username: userInfo.username || 'student',
          bio: userInfo.bio || '',
          email: userInfo.email || ''
        };
      });
      setPendingRequests(list);
    });

    // Load user classes count
    const localClasses = JSON.parse(localStorage.getItem('local_classes') || '[]');
    setClassesCount(localClasses.length);
    setUserClasses(localClasses);

    // Fetch all directory users for search
    fetchDirectoryUsers();

    return () => {
      unsubFollowers();
      unsubFollowing();
      unsubSentFollows();
      unsubRequests();
    };
  }, [user]);

  const fetchDirectoryUsers = async () => {
    try {
      const qSnap = await getDocs(collection(db, 'users'));
      const list = qSnap.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })).filter(u => u.uid !== user?.uid);

      if (list.length > 0) {
        // Merge list with mockStudents ensuring no duplicates by uid
        const merged = [...list];
        mockStudents.forEach(ms => {
          if (!merged.some(u => u.uid === ms.uid)) {
            merged.push(ms);
          }
        });
        setAllUsers(merged);
      } else {
        setAllUsers(mockStudents.filter(u => u.uid !== user?.uid));
      }
    } catch (err) {
      setAllUsers(mockStudents.filter(u => u.uid !== user?.uid));
    }
  };

  // Filter users when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const queryLower = searchQuery.toLowerCase();
    const filtered = allUsers.filter(u => 
      (u.displayName || '').toLowerCase().includes(queryLower) ||
      (u.username || '').toLowerCase().includes(queryLower) ||
      (u.email || '').toLowerCase().includes(queryLower)
    );
    setSearchResults(filtered);
  }, [searchQuery, allUsers]);

  // Handle profile image upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target.result;
      setCustomAvatar(base64);
      localStorage.setItem('custom_avatar_' + user.uid, base64);
      
      // Update in Firestore
      try {
        updateDoc(doc(db, 'users', user.uid), { customAvatar: base64 });
      } catch (err) {
        console.warn('Could not sync avatar to Firestore:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  // Open edit profile modal
  const openEditModal = () => {
    setEditNameInput(displayName);
    setEditUsernameInput(username);
    setEditBioInput(bio);
    setIsEditModalOpen(true);
  };

  // Save profile edits
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setDisplayName(editNameInput);
    setUsername(editUsernameInput);
    setBio(editBioInput);

    const updatedData = {
      displayName: editNameInput,
      username: editUsernameInput,
      bio: editBioInput
    };
    localStorage.setItem('profile_data_' + user.uid, JSON.stringify(updatedData));

    try {
      await updateDoc(doc(db, 'users', user.uid), updatedData);
    } catch (err) {
      console.warn('Could not sync profile edits to Firestore:', err);
    }
    setIsEditModalOpen(false);
  };

  // Handle Theme Change
  const handleThemeChange = async (themeKey) => {
    if (!user || updatingTheme) return;
    setUpdatingTheme(true);
    try {
      await changeTheme(themeKey);
    } catch (error) {
      console.error('Error updating theme:', error);
    } finally {
      setUpdatingTheme(false);
    }
  };

  // Share profile copies mock url
  const handleShareProfile = () => {
    const mockUrl = `${window.location.origin}/user/${username}`;
    navigator.clipboard.writeText(mockUrl);
    alert('Profile link copied to clipboard! 📋');
  };

  // Follow / Unfollow logic for other users (real-time Firestore)
  const toggleFollowUser = async (targetUser) => {
    if (!user) return;
    try {
      const followDoc = sentFollowsList.find(f => f.followingId === targetUser.uid);
      if (followDoc) {
        // Unfollow or cancel request
        await deleteDoc(doc(db, 'follows', followDoc.id));
        if (selectedUser && selectedUser.uid === targetUser.uid) {
          setSelectedUser(prev => prev ? {
            ...prev,
            followersCount: Math.max(0, prev.followersCount - (followDoc.status === 'accepted' ? 1 : 0))
          } : null);
        }
      } else {
        // Send follow request
        await addDoc(collection(db, 'follows'), {
          followerId: user.uid,
          followingId: targetUser.uid,
          status: 'pending',
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  // Remove follower
  const removeFollower = async (followerUid) => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'follows'),
        where('followerId', '==', followerUid),
        where('followingId', '==', user.uid)
      );
      const snap = await getDocs(q);
      snap.forEach(async (d) => {
        await deleteDoc(d.ref);
      });
    } catch (err) {
      console.error("Error removing follower:", err);
    }
  };

  // Accept follow request
  const acceptFollowRequest = async (requestDocId) => {
    try {
      await updateDoc(doc(db, 'follows', requestDocId), {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error accepting follow request:", err);
    }
  };

  // Decline/Ignore follow request
  const declineFollowRequest = async (requestDocId) => {
    try {
      await deleteDoc(doc(db, 'follows', requestDocId));
    } catch (err) {
      console.error("Error declining follow request:", err);
    }
  };

  // Add new highlights
  const handleCreateHighlight = (e) => {
    e.preventDefault();
    if (!newHighlightName.trim()) return;

    const gradients = [
      'from-pink-500 via-red-500 to-yellow-500',
      'from-purple-600 to-blue-500',
      'from-green-400 to-blue-500',
      'from-yellow-200 via-pink-200 to-red-200',
      'from-indigo-400 via-purple-400 to-pink-400'
    ];
    const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

    const newHighlight = {
      id: 'h_' + Date.now(),
      name: newHighlightName.trim(),
      gradient: randomGradient,
      img: ''
    };
    setHighlights([...highlights, newHighlight]);
    setNewHighlightName('');
    setShowNewHighlightModal(false);
  };

  return (
    <div className="w-full min-h-screen bg-bg text-text font-outfit relative overflow-x-hidden animate-page-in pb-16">
      
      {/* ─── STICKY HEADER / TOP BAR ─── */}
      <header className="sticky top-0 bg-bg/85 backdrop-blur-md border-b border-border/20 px-4 py-3.5 z-40 flex justify-between items-center max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="font-playfair italic font-extrabold text-2xl tracking-wide text-text">Utopia</span>
          <span className="text-xs font-bold text-dim bg-surface px-2 py-0.5 rounded-full border border-border/30">
            @{username}
          </span>
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-xs mx-4">
          <Search size={16} className="absolute left-3 top-2.5 text-dim" />
          <input 
            type="text"
            placeholder="Search campus users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface/40 hover:bg-surface/60 border border-border/40 focus:border-primary/60 rounded-xl pl-9 pr-8 py-1.5 text-xs text-text placeholder:text-dim/60 focus:outline-none transition-all font-semibold"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-dim hover:text-text"
            >
              <X size={14} />
            </button>
          )}

          {/* Search Dropdown Panel */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-surface/95 border border-border/50 rounded-2xl shadow-xl z-50 mt-1 max-h-72 overflow-y-auto divide-y divide-border/20 backdrop-blur-md animate-fade-scale">
              {searchResults.map(searched => {
                const followDoc = sentFollowsList.find(f => f.followingId === searched.uid);
                const isFollowing = followDoc?.status === 'accepted';
                const isRequested = followDoc?.status === 'pending';
                
                return (
                  <div 
                    key={searched.uid}
                    onClick={async () => {
                      let followersCount = 0;
                      let followingCount = 0;
                      try {
                        const followersQ = query(
                          collection(db, 'follows'),
                          where('followingId', '==', searched.uid),
                          where('status', '==', 'accepted')
                        );
                        const followingQ = query(
                          collection(db, 'follows'),
                          where('followerId', '==', searched.uid),
                          where('status', '==', 'accepted')
                        );
                        const [followersSnap, followingSnap] = await Promise.all([
                          getDocs(followersQ),
                          getDocs(followingQ)
                        ]);
                        followersCount = followersSnap.size;
                        followingCount = followingSnap.size;
                      } catch (err) {
                        console.warn("Error fetching user counts:", err);
                      }

                      setSelectedUser({
                        ...searched,
                        followersCount,
                        followingCount,
                        classesCount: Math.floor(Math.random() * 6),
                      });
                      setIsUserModalOpen(true);
                      setSearchQuery('');
                    }}
                    className="p-3 flex items-center justify-between hover:bg-bg/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-peach/30 border border-border/30 flex items-center justify-center font-bold text-xs text-primary">
                        {searched.displayName?.charAt(0).toUpperCase() || 'S'}
                      </div>
                      <div>
                        <h4 className="font-bold text-text text-[13px]">{searched.displayName}</h4>
                        <p className="text-dim text-[11px] font-medium">@{searched.username || 'student'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFollowUser(searched);
                      }}
                      className={`text-xs px-3 py-1 rounded-lg font-bold border transition-all ${
                        isFollowing 
                          ? 'bg-surface border-border text-sub hover:bg-bg' 
                          : isRequested 
                            ? 'bg-surface/50 border-border/40 text-dim' 
                            : 'bg-primary text-bg border-primary/20 hover:scale-[1.02]'
                      }`}
                    >
                      {isFollowing ? 'Following' : isRequested ? 'Requested' : 'Follow'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3 Lines Hamburger Menu Button */}
        <button 
          onClick={() => {
            setActiveSettingsTab('main');
            setIsDrawerOpen(true);
          }}
          className="p-2 hover:bg-surface/50 rounded-xl text-text hover:text-primary transition-all active:scale-95"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* ─── MAIN PROFILE CONTENT ─── */}
      <main className="max-w-4xl mx-auto px-4 pt-6">
        
        {/* Instagram Profile Grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-6 items-start pb-6">
          
          {/* Avatar Column (Left) */}
          <div className="col-span-1 flex flex-col items-center justify-center relative">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 md:w-28 md:h-28 rounded-full p-[3px] bg-gradient-to-tr from-primary via-peach to-teal flex items-center justify-center cursor-pointer relative group shadow-lg hover:rotate-3 transition-transform duration-300"
              title="Click to Upload Photo"
            >
              <div className="w-full h-full rounded-full bg-surface border-2 border-bg overflow-hidden flex items-center justify-center relative">
                {customAvatar ? (
                  <img src={customAvatar} alt="Profile" className="w-full h-full object-cover" />
                ) : user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-2xl md:text-3xl font-black text-primary">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                
                {/* Upload Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload size={18} className="text-white animate-bounce" />
                </div>
              </div>

              {/* Instagram Style Add Plus Badge */}
              <div className="absolute bottom-0 right-0 bg-primary border-2 border-bg rounded-full p-1 shadow-md text-bg group-hover:scale-110 transition-transform">
                <Plus size={12} className="stroke-[3]" />
              </div>
            </div>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Stats & Actions Area (Right) */}
          <div className="col-span-2 md:col-span-3 flex flex-col justify-center h-full">
            
            {/* Stats Row */}
            <div className="flex justify-around items-center text-center py-2 border-b border-border/10">
              <div>
                <div className="text-[17px] font-black text-text">{classesCount}</div>
                <div className="text-xs text-dim font-bold">classes</div>
              </div>
              <button 
                onClick={() => setIsFollowersModalOpen(true)}
                className="hover:scale-105 transition-transform"
              >
                <div className="text-[17px] font-black text-text">
                  {followersList.length}
                </div>
                <div className="text-xs text-dim font-bold">followers</div>
              </button>
              <button 
                onClick={() => setIsFollowingModalOpen(true)}
                className="hover:scale-105 transition-transform"
              >
                <div className="text-[17px] font-black text-text">
                  {followingList.length}
                </div>
                <div className="text-xs text-dim font-bold">following</div>
              </button>
            </div>

            {/* Action Buttons (Tablet/Desktop display under Stats) */}
            <div className="hidden md:flex gap-3 mt-4">
              <button 
                onClick={openEditModal}
                className="flex-1 py-2 bg-surface/50 border border-border/40 hover:border-border hover:bg-surface text-text font-bold text-xs rounded-xl transition-all shadow-sm"
              >
                Edit profile
              </button>
              <button 
                onClick={handleShareProfile}
                className="flex-1 py-2 bg-surface/50 border border-border/40 hover:border-border hover:bg-surface text-text font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Share2 size={13} />
                Share profile
              </button>
            </div>

          </div>
        </div>

        {/* Name and Bio Info Box (Below Avatar/Stats) */}
        <div className="pb-6 border-b border-border/15">
          <h2 className="font-extrabold text-base text-text">{displayName}</h2>
          <p className="text-xs text-dim font-semibold mb-2">Academic Member</p>
          <p className="text-[13px] leading-relaxed text-text font-medium whitespace-pre-line">
            {bio}
          </p>
        </div>

        {/* Action Buttons (Mobile display below Bio) */}
        <div className="flex md:hidden gap-3 py-4 border-b border-border/15">
          <button 
            onClick={openEditModal}
            className="flex-1 py-2 bg-surface/40 border border-border/30 hover:bg-surface text-text font-bold text-xs rounded-xl transition-all active:scale-98"
          >
            Edit profile
          </button>
          <button 
            onClick={handleShareProfile}
            className="flex-1 py-2 bg-surface/40 border border-border/30 hover:bg-surface text-text font-bold text-xs rounded-xl transition-all active:scale-98 flex items-center justify-center gap-1.5"
          >
            <Share2 size={13} />
            Share profile
          </button>
        </div>

        {/* Highlights / Stories Section */}
        <div className="py-6 border-b border-border/15 flex items-center gap-4 overflow-x-auto hide-scrollbar">
          {/* Default/Anime Highlights */}
          {highlights.map((hl) => (
            <div 
              key={hl.id} 
              className="flex flex-col items-center shrink-0 cursor-pointer group"
              onClick={() => setShowHighlightViewer(hl)}
            >
              <div className="w-[66px] h-[66px] rounded-full p-[2px] bg-gradient-to-tr from-pink-500 via-red-500 to-peach flex items-center justify-center group-hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-full border-2 border-bg bg-surface overflow-hidden flex items-center justify-center">
                  {hl.img ? (
                    <img src={hl.img} alt={hl.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${hl.gradient}`} />
                  )}
                </div>
              </div>
              <span className="text-[11px] font-bold text-sub text-center mt-1.5 max-w-[70px] truncate">{hl.name}</span>
            </div>
          ))}

          {/* Add Highlight Bubble */}
          <div 
            onClick={() => setShowNewHighlightModal(true)}
            className="flex flex-col items-center shrink-0 cursor-pointer group"
          >
            <div className="w-[66px] h-[66px] rounded-full p-[2px] bg-border/40 hover:bg-border/60 flex items-center justify-center group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-full border-2 border-bg bg-surface flex items-center justify-center text-dim group-hover:text-text">
                <Plus size={20} />
              </div>
            </div>
            <span className="text-[11px] font-bold text-sub text-center mt-1.5">New</span>
          </div>
        </div>

        {/* ─── INSTAGRAM PROFILE CONTENT TABS ─── */}
        <div className="flex border-b border-border/25 text-center mt-4">
          <button 
            onClick={() => setActiveProfileTab('grid')}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold transition-all border-b-2 ${activeProfileTab === 'grid' ? 'border-primary text-primary' : 'border-transparent text-dim hover:text-text'}`}
          >
            <Grid size={16} />
            CLASSES
          </button>
          <button 
            onClick={() => setActiveProfileTab('saved')}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold transition-all border-b-2 ${activeProfileTab === 'saved' ? 'border-primary text-primary' : 'border-transparent text-dim hover:text-text'}`}
          >
            <Bookmark size={16} />
            SAVED
          </button>
          <button 
            onClick={() => setActiveProfileTab('tagged')}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold transition-all border-b-2 ${activeProfileTab === 'tagged' ? 'border-primary text-primary' : 'border-transparent text-dim hover:text-text'}`}
          >
            <Tag size={16} />
            TAGS
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="py-6">
          {activeProfileTab === 'grid' && (
            <div>
              {userClasses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {userClasses.map(cls => (
                    <div 
                      key={cls.id}
                      onClick={() => navigate(`/app/class-notes?classId=${cls.id}&className=${encodeURIComponent(cls.name)}`)}
                      className="bg-surface/30 border border-border/40 hover:border-primary/30 p-5 rounded-2xl cursor-pointer hover:shadow-lg transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md">
                          {cls.classCode}
                        </span>
                        <h4 className="font-bold text-text mt-3 text-[15px] group-hover:text-primary truncate">{cls.name}</h4>
                        <p className="text-dim text-[11px] mt-1 font-semibold">{cls.memberCount || 1} Members</p>
                      </div>
                      <span className="text-primary text-xs font-extrabold flex items-center gap-0.5 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        Go to Class &rarr;
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-surface/10 border border-border/20 border-dashed rounded-3xl">
                  <Grid size={32} className="mx-auto text-dim/60 mb-2" />
                  <p className="text-dim text-xs font-bold">No academic classes enrolled yet.</p>
                  <button 
                    onClick={() => navigate('/app/library')}
                    className="mt-3 px-4 py-1.5 bg-primary/10 border border-primary/20 hover:bg-primary hover:text-bg text-primary text-xs font-extrabold rounded-lg transition-all"
                  >
                    Browse Semesters
                  </button>
                </div>
              )}
            </div>
          )}

          {activeProfileTab === 'saved' && (
            <div className="text-center py-16 bg-surface/10 border border-border/20 border-dashed rounded-3xl">
              <Bookmark size={32} className="mx-auto text-dim/60 mb-2" />
              <p className="text-dim text-xs font-bold">No saved study materials or notes bookmarks.</p>
            </div>
          )}

          {activeProfileTab === 'tagged' && (
            <div className="text-center py-16 bg-surface/10 border border-border/20 border-dashed rounded-3xl">
              <Tag size={32} className="mx-auto text-dim/60 mb-2" />
              <p className="text-dim text-xs font-bold">No academic tags or mentions.</p>
            </div>
          )}
        </div>

      </main>

      {/* ─── SETTINGS DRAWER / HAMBURGER SHEET (Sliding from right) ─── */}
      {isDrawerOpen && (
        <>
          {/* Overlay backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed top-0 right-0 h-screen w-80 max-w-[85vw] bg-surface border-l border-border/40 z-50 p-6 overflow-y-auto shadow-2xl animate-slide-right flex flex-col justify-between">
            <div>
              {/* Drawer Header */}
              <div className="flex justify-between items-center pb-4 border-b border-border/20 mb-6">
                <h3 className="font-extrabold text-base text-text">Settings & activity</h3>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 hover:bg-bg rounded-lg text-dim hover:text-text"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Settings Sub-view Controller */}
              {activeSettingsTab === 'main' ? (
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setIsFollowRequestsModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-bg/40 rounded-xl transition-colors border border-transparent hover:border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><User size={18} /></div>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-text">Follow Requests</h4>
                        <p className="text-[11px] text-dim font-medium">
                          {pendingRequests.length > 0 ? `${pendingRequests.length} pending request${pendingRequests.length > 1 ? 's' : ''}` : 'No pending requests'}
                        </p>
                      </div>
                    </div>
                    {pendingRequests.length > 0 && (
                      <span className="bg-primary text-bg text-[10px] font-black px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
                    )}
                  </button>

                  <button 
                    onClick={() => setActiveSettingsTab('theme')}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-bg/40 rounded-xl transition-colors border border-transparent hover:border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Palette size={18} /></div>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-text">Appearance</h4>
                        <p className="text-[11px] text-dim font-medium">Customize workspace theme</p>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => setActiveSettingsTab('account')}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-bg/40 rounded-xl transition-colors border border-transparent hover:border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-teal/10 rounded-xl flex items-center justify-center text-teal"><Settings size={18} /></div>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-text">Account settings</h4>
                        <p className="text-[11px] text-dim font-medium">Update account email & key</p>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => setActiveSettingsTab('notifications')}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-bg/40 rounded-xl transition-colors border border-transparent hover:border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-peach/10 rounded-xl flex items-center justify-center text-peach"><Bell size={18} /></div>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-text">Notifications</h4>
                        <p className="text-[11px] text-dim font-medium">Configure email alerts</p>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => setActiveSettingsTab('privacy')}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-bg/40 rounded-xl transition-colors border border-transparent hover:border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-red/10 rounded-xl flex items-center justify-center text-red"><Shield size={18} /></div>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-text">Privacy</h4>
                        <p className="text-[11px] text-dim font-medium">Control data permissions</p>
                      </div>
                    </div>
                  </button>
                </div>
              ) : (
                /* Sub-setting Panel (Themes or others) */
                <div>
                  <button 
                    onClick={() => setActiveSettingsTab('main')}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mb-4"
                  >
                    &larr; Back to Settings
                  </button>

                  {/* Themes view */}
                  {activeSettingsTab === 'theme' && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-text">Select Theme Accent</h4>
                      <div className="grid grid-cols-1 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
                        {Object.keys(themes).map((themeKey) => {
                          const themeObj = themes[themeKey];
                          const isSelected = currentThemeId === themeKey;
                          const label = themeKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                          return (
                            <button
                              key={themeKey}
                              onClick={() => handleThemeChange(themeKey)}
                              disabled={updatingTheme}
                              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${isSelected ? 'border-primary bg-bg shadow-md' : 'border-border/30 hover:border-border/70 hover:bg-bg/40'}`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border border-border/20" style={{ backgroundColor: themeObj.primary }}></div>
                                <span className="text-xs font-bold text-text">{label}</span>
                              </div>
                              {isSelected && <CheckCircle2 size={16} className="text-primary" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Account Settings view */}
                  {activeSettingsTab === 'account' && (
                    <div className="space-y-3 bg-bg/40 p-4 rounded-2xl border border-border/20">
                      <h4 className="text-xs font-bold text-text uppercase">Account credentials</h4>
                      <p className="text-[11px] text-sub font-medium">Currently signed in as:</p>
                      <p className="text-xs font-bold text-text bg-surface px-3 py-1.5 rounded-lg border border-border/30 truncate">{user?.email}</p>
                      <button 
                        onClick={() => alert('Account configuration details sent to your registered academic email.')}
                        className="w-full py-2 bg-primary/10 border border-primary/20 text-primary text-xs font-extrabold rounded-lg hover:bg-primary hover:text-bg transition-colors"
                      >
                        Reset password credentials
                      </button>
                    </div>
                  )}

                  {/* Notifications view */}
                  {activeSettingsTab === 'notifications' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-text uppercase">Notification preferences</h4>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded border-border text-primary focus:ring-primary" />
                        <span className="text-xs font-bold text-text">Email Class Notes Digests</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded border-border text-primary focus:ring-primary" />
                        <span className="text-xs font-bold text-text">Chat Direct Messages Alerts</span>
                      </label>
                    </div>
                  )}

                  {/* Privacy view */}
                  {activeSettingsTab === 'privacy' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-text uppercase">Privacy Settings</h4>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded border-border text-primary focus:ring-primary" />
                        <span className="text-xs font-bold text-text">Public directory visibility</span>
                      </label>
                      <p className="text-[10px] text-dim leading-relaxed font-semibold">
                        Disabling visibility hides your student card from search results on the campus directory index.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Logout button at drawer footer */}
            <div className="pt-4 border-t border-border/20 mt-6">
              <button 
                onClick={() => {
                  setIsDrawerOpen(false);
                  signOut();
                }}
                className="w-full py-3 bg-red/10 border border-red/20 text-red font-bold text-xs rounded-xl hover:bg-red hover:text-bg transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── MODAL: EDIT PROFILE ─── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveProfile} className="bg-surface border border-border/50 rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative space-y-4 animate-fade-scale">
            <button 
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-6 right-6 p-1.5 hover:bg-bg rounded-lg text-dim hover:text-text transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-black text-text border-b border-border/10 pb-2">Edit profile</h3>

            <div>
              <label className="block text-xs font-bold text-sub mb-1.5 uppercase tracking-wide">Display Name</label>
              <input 
                type="text"
                value={editNameInput}
                onChange={(e) => setEditNameInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg border border-border/40 focus:border-primary rounded-xl text-text font-semibold focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sub mb-1.5 uppercase tracking-wide">Username</label>
              <input 
                type="text"
                value={editUsernameInput}
                onChange={(e) => setEditUsernameInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg border border-border/40 focus:border-primary rounded-xl text-text font-semibold focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sub mb-1.5 uppercase tracking-wide">Bio</label>
              <textarea 
                rows={4}
                value={editBioInput}
                onChange={(e) => setEditBioInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg border border-border/40 focus:border-primary rounded-xl text-text font-semibold focus:outline-none resize-none"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-3.5 bg-primary text-bg font-extrabold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs"
            >
              Save Profile changes
            </button>
          </form>
        </div>
      )}

      {/* ─── MODAL: FOLLOWERS LIST ─── */}
      {isFollowersModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border/50 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative flex flex-col max-h-[80vh] animate-fade-scale">
            <button 
              onClick={() => setIsFollowersModalOpen(false)}
              className="absolute top-6 right-6 p-1.5 hover:bg-bg rounded-lg text-dim hover:text-text transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-black text-text border-b border-border/10 pb-3 mb-4">Followers</h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 divide-y divide-border/10">
              {followersList.map(follower => (
                <div key={follower.uid} className="pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm">
                      {follower.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-text text-xs">{follower.displayName}</h4>
                      <p className="text-dim text-[10px] font-medium">@{follower.username}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFollower(follower.uid)}
                    className="text-[11px] font-bold px-3 py-1 bg-red/10 border border-red/20 text-red rounded-lg hover:bg-red hover:text-bg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {followersList.length === 0 && (
                <div className="text-center py-10 text-dim text-xs font-semibold">
                  No followers yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: FOLLOWING LIST ─── */}
      {isFollowingModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border/50 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative flex flex-col max-h-[80vh] animate-fade-scale">
            <button 
              onClick={() => setIsFollowingModalOpen(false)}
              className="absolute top-6 right-6 p-1.5 hover:bg-bg rounded-lg text-dim hover:text-text transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-black text-text border-b border-border/10 pb-3 mb-4">Following</h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 divide-y divide-border/10">
              {followingList.map(followed => (
                <div key={followed.uid} className="pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal/10 text-teal border border-teal/20 flex items-center justify-center font-bold text-sm">
                      {followed.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-text text-xs">{followed.displayName}</h4>
                      <p className="text-dim text-[10px] font-medium">@{followed.username}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleFollowUser(followed)}
                    className="text-[11px] font-bold px-3 py-1 bg-surface border border-border text-sub hover:bg-red/10 hover:text-red hover:border-red/20 transition-all"
                  >
                    Unfollow
                  </button>
                </div>
              ))}
              {followingList.length === 0 && (
                <div className="text-center py-10 text-dim text-xs font-semibold">
                  You are not following anyone yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: OTHER USER PROFILE DETAIL (Viewer) ─── */}
      {isUserModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border/50 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative space-y-6 animate-fade-scale">
            <button 
              onClick={() => { setSelectedUser(null); setIsUserModalOpen(false); }}
              className="absolute top-6 right-6 p-1.5 hover:bg-bg rounded-lg text-dim hover:text-text transition-colors"
            >
              <X size={18} />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4 border-b border-border/10 pb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-peach flex items-center justify-center font-black text-xl text-bg">
                {selectedUser.displayName?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div>
                <h3 className="font-black text-text text-base">{selectedUser.displayName}</h3>
                <p className="text-dim text-xs font-bold">@{selectedUser.username || 'student'}</p>
                <p className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full mt-1.5 font-bold inline-block">
                  {selectedUser.role || 'Campus Member'}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 py-1 text-center bg-bg/40 rounded-2xl border border-border/20">
              <div>
                <div className="text-[15px] font-black text-text">{selectedUser.classesCount}</div>
                <div className="text-[10px] text-dim font-bold">classes</div>
              </div>
              <div>
                <div className="text-[15px] font-black text-text">{selectedUser.followersCount}</div>
                <div className="text-[10px] text-dim font-bold">followers</div>
              </div>
              <div>
                <div className="text-[15px] font-black text-text">{selectedUser.followingCount}</div>
                <div className="text-[10px] text-dim font-bold">following</div>
              </div>
            </div>

            {/* Bio */}
            <div>
              <h4 className="text-xs font-bold text-sub uppercase mb-1.5">Bio</h4>
              <p className="text-xs leading-relaxed text-text font-medium bg-bg/20 p-3.5 border border-border/30 rounded-2xl whitespace-pre-line">
                {selectedUser.bio || 'Hello, I am a classmate using Utopia for learning!'}
              </p>
            </div>

            {/* Actions */}
            {(() => {
              const followDoc = sentFollowsList.find(f => f.followingId === selectedUser.uid);
              const isFollowing = followDoc?.status === 'accepted';
              const isRequested = followDoc?.status === 'pending';
              
              return (
                <div className="flex gap-3 border-t border-border/10 pt-4">
                  <button 
                    onClick={() => toggleFollowUser(selectedUser)}
                    className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all border ${
                      isFollowing 
                        ? 'bg-surface border-border text-sub hover:bg-red/10 hover:text-red hover:border-red/20' 
                        : isRequested
                          ? 'bg-surface border-border text-dim hover:bg-red/10 hover:text-red hover:border-red/20'
                          : 'bg-primary text-bg border-primary/20 hover:scale-[1.02]'
                    }`}
                  >
                    {isFollowing ? 'Unfollow classmate' : isRequested ? 'Cancel Request' : 'Follow classmate'}
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedUser(null);
                      setIsUserModalOpen(false);
                      navigate('/app/chat');
                    }}
                    className="py-3 px-4 bg-surface/50 border border-border/40 hover:bg-surface text-text rounded-xl transition-all flex items-center justify-center"
                    title="Send Direct Message"
                  >
                    <MessageSquare size={16} />
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ─── MODAL: HIGHLIGHT VIEWER ─── */}
      {showHighlightViewer && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setShowHighlightViewer(null)}
        >
          <div 
            className="w-full max-w-sm bg-surface border border-border/30 rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-fade-scale flex flex-col justify-between h-[75vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="p-4 flex justify-between items-center bg-black/10 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-500 to-peach flex items-center justify-center font-bold text-xs text-white">
                  M
                </div>
                <span className="text-xs font-bold text-text">{showHighlightViewer.name}</span>
              </div>
              <button 
                onClick={() => setShowHighlightViewer(null)}
                className="p-1.5 hover:bg-bg rounded-lg text-dim hover:text-text"
              >
                <X size={16} />
              </button>
            </div>

            {/* Inner Content (Anime mock photo or gradient) */}
            <div className="flex-1 flex items-center justify-center p-8 bg-black/20">
              {showHighlightViewer.img ? (
                <div className="w-full h-full rounded-2xl overflow-hidden shadow-xl border border-white/10 relative group">
                  <img src={showHighlightViewer.img} alt={showHighlightViewer.name} className="w-full h-full object-cover" />
                  <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-3.5 border border-white/10 rounded-xl text-center">
                    <p className="text-xs font-bold text-white">🔥 Live Highlights from College Archive</p>
                  </div>
                </div>
              ) : (
                <div className={`w-full h-full rounded-2xl bg-gradient-to-br ${showHighlightViewer.gradient} flex flex-col items-center justify-center text-center p-6 border border-white/10 shadow-xl`}>
                  <Award size={48} className="text-bg animate-pulse mb-3" />
                  <h4 className="text-lg font-black text-bg">{showHighlightViewer.name}</h4>
                  <p className="text-xs text-bg/80 mt-1 font-semibold">Custom Highlight Album</p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-black/10 border-t border-white/5 text-center text-[10px] text-dim font-bold">
              Tap anywhere outside the card to exit
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE NEW HIGHLIGHT ─── */}
      {showNewHighlightModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateHighlight} className="bg-surface border border-border/50 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative space-y-4 animate-fade-scale">
            <button 
              type="button"
              onClick={() => setShowNewHighlightModal(false)}
              className="absolute top-6 right-6 p-1.5 hover:bg-bg rounded-lg text-dim hover:text-text transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-black text-text border-b border-border/10 pb-2">New highlight</h3>

            <div>
              <label className="block text-xs font-bold text-sub mb-1.5 uppercase tracking-wide">Highlight Name</label>
              <input 
                type="text"
                placeholder="e.g. Campus, Friends"
                maxLength={15}
                value={newHighlightName}
                onChange={(e) => setNewHighlightName(e.target.value)}
                className="w-full px-4 py-2 bg-bg border border-border/40 focus:border-primary rounded-xl text-text font-semibold focus:outline-none text-xs"
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full py-3 bg-primary text-bg font-extrabold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs"
            >
              Add Highlight Bubble
            </button>
          </form>
        </div>
      )}

      {/* ─── MODAL: FOLLOW REQUESTS ─── */}
      {isFollowRequestsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border/50 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative flex flex-col max-h-[80vh] animate-fade-scale">
            <button 
              onClick={() => setIsFollowRequestsModalOpen(false)}
              className="absolute top-6 right-6 p-1.5 hover:bg-bg rounded-lg text-dim hover:text-text transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-black text-text border-b border-border/10 pb-3 mb-4">Follow Requests</h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 divide-y divide-border/10">
              {pendingRequests.map(req => (
                <div key={req.requestDocId} className="pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm">
                      {req.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-text text-xs">{req.displayName}</h4>
                      <p className="text-dim text-[10px] font-medium">@{req.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => acceptFollowRequest(req.requestDocId)}
                      className="text-[11px] font-bold px-3 py-1 bg-primary text-bg rounded-lg hover:scale-105 transition-all"
                    >
                      Confirm
                    </button>
                    <button 
                      onClick={() => declineFollowRequest(req.requestDocId)}
                      className="text-[11px] font-bold px-3 py-1 bg-surface border border-border text-sub hover:bg-red/10 hover:text-red hover:border-red/20 transition-all rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {pendingRequests.length === 0 && (
                <div className="text-center py-10 text-dim text-xs font-semibold">
                  No pending follow requests.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
