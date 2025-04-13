// Mock data for the application

// Mock Users
export const mockUsers = [
  {
    uid: "user1",
    displayName: "Alex Johnson",
    email: "alex@example.com",
    interests: ["music", "gaming", "technology", "travel"],
    photoURL: "https://randomuser.me/api/portraits/men/1.jpg",
    createdAt: new Date("2023-01-15")
  },
  {
    uid: "user2",
    displayName: "Maya Patel",
    email: "maya@example.com",
    interests: ["books", "movies", "photography", "hiking"],
    photoURL: "https://randomuser.me/api/portraits/women/2.jpg",
    createdAt: new Date("2023-02-10")
  },
  {
    uid: "user3",
    displayName: "Carlos Rodriguez",
    email: "carlos@example.com",
    interests: ["sports", "cooking", "music", "travel"],
    photoURL: "https://randomuser.me/api/portraits/men/3.jpg",
    createdAt: new Date("2023-03-05")
  },
  {
    uid: "user4",
    displayName: "Sophie Wilson",
    email: "sophie@example.com",
    interests: ["art", "design", "fashion", "photography"],
    photoURL: "https://randomuser.me/api/portraits/women/4.jpg",
    createdAt: new Date("2023-04-20")
  },
  {
    uid: "user5",
    displayName: "David Kim",
    email: "david@example.com",
    interests: ["technology", "science", "gaming", "books"],
    photoURL: "https://randomuser.me/api/portraits/men/5.jpg",
    createdAt: new Date("2023-05-12")
  }
];

// Mock Clubs
export const mockClubs = [
  {
    id: "club1",
    name: "Photography Enthusiasts",
    description: "A group for sharing photography tips, techniques, and showcasing your best shots.",
    category: "Photography",
    memberCount: 128,
    createdBy: "user2",
    createdAt: new Date("2023-03-10")
  },
  {
    id: "club2",
    name: "Tech Innovators",
    description: "Discussion about the latest in technology, programming, and digital innovation.",
    category: "Technology",
    memberCount: 256,
    createdBy: "user5",
    createdAt: new Date("2023-02-15")
  },
  {
    id: "club3",
    name: "Music Lovers",
    description: "Share and discover new music across all genres. From classical to electronic and everything in between.",
    category: "Music",
    memberCount: 189,
    createdBy: "user1",
    createdAt: new Date("2023-01-20")
  },
  {
    id: "club4",
    name: "Bookworms Unite",
    description: "A virtual book club where members discuss their current reads and literary classics.",
    category: "Books",
    memberCount: 94,
    createdBy: "user4",
    createdAt: new Date("2023-04-25")
  },
  {
    id: "club5",
    name: "Travel Adventures",
    description: "Share travel stories, tips, and plan adventures with fellow travel enthusiasts.",
    category: "Travel",
    memberCount: 145,
    createdBy: "user3",
    createdAt: new Date("2023-05-05")
  },
  {
    id: "club6",
    name: "Gaming Guild",
    description: "Connect with other gamers, discuss strategies, and organize gaming sessions.",
    category: "Gaming",
    memberCount: 210,
    createdBy: "user1",
    createdAt: new Date("2023-03-28")
  }
];

// Mock Chats
export const mockChats = [
  {
    id: "chat1",
    users: ["user1", "user2"],
    userDetails: {
      user1: { displayName: "Alex Johnson", photoURL: "https://randomuser.me/api/portraits/men/1.jpg" },
      user2: { displayName: "Maya Patel", photoURL: "https://randomuser.me/api/portraits/women/2.jpg" }
    },
    lastMessage: { text: "Hey, did you see the new photography exhibit?" },
    updatedAt: new Date("2023-05-28T14:30:00")
  },
  {
    id: "chat2",
    users: ["user1", "user3"],
    userDetails: {
      user1: { displayName: "Alex Johnson", photoURL: "https://randomuser.me/api/portraits/men/1.jpg" },
      user3: { displayName: "Carlos Rodriguez", photoURL: "https://randomuser.me/api/portraits/men/3.jpg" }
    },
    lastMessage: { text: "I found this new band you might like!" },
    updatedAt: new Date("2023-05-27T09:45:00")
  },
  {
    id: "chat3",
    users: ["user2", "user4"],
    userDetails: {
      user2: { displayName: "Maya Patel", photoURL: "https://randomuser.me/api/portraits/women/2.jpg" },
      user4: { displayName: "Sophie Wilson", photoURL: "https://randomuser.me/api/portraits/women/4.jpg" }
    },
    lastMessage: { text: "What do you think about the new art exhibition?" },
    updatedAt: new Date("2023-05-25T16:20:00")
  }
];

// Mock Messages for Chats
export const mockMessages = {
  chat1: [
    {
      id: "msg1_1",
      text: "Hi Maya! How are you doing?",
      senderId: "user1",
      senderName: "Alex Johnson",
      timestamp: new Date("2023-05-28T14:20:00")
    },
    {
      id: "msg1_2",
      text: "Hey Alex! I'm good, just got back from a photography trip.",
      senderId: "user2",
      senderName: "Maya Patel",
      timestamp: new Date("2023-05-28T14:25:00")
    },
    {
      id: "msg1_3",
      text: "That sounds amazing! Did you get some good shots?",
      senderId: "user1",
      senderName: "Alex Johnson",
      timestamp: new Date("2023-05-28T14:27:00")
    },
    {
      id: "msg1_4",
      text: "Yes, definitely! Hey, did you see the new photography exhibit?",
      senderId: "user2",
      senderName: "Maya Patel",
      timestamp: new Date("2023-05-28T14:30:00")
    }
  ],
  chat2: [
    {
      id: "msg2_1",
      text: "Carlos, what's up?",
      senderId: "user1",
      senderName: "Alex Johnson",
      timestamp: new Date("2023-05-27T09:30:00")
    },
    {
      id: "msg2_2",
      text: "Not much, just listening to some new music.",
      senderId: "user3",
      senderName: "Carlos Rodriguez",
      timestamp: new Date("2023-05-27T09:35:00")
    },
    {
      id: "msg2_3",
      text: "Anything good?",
      senderId: "user1",
      senderName: "Alex Johnson",
      timestamp: new Date("2023-05-27T09:40:00")
    },
    {
      id: "msg2_4",
      text: "I found this new band you might like!",
      senderId: "user3",
      senderName: "Carlos Rodriguez",
      timestamp: new Date("2023-05-27T09:45:00")
    }
  ],
  chat3: [
    {
      id: "msg3_1",
      text: "Sophie, have you been to any art galleries lately?",
      senderId: "user2",
      senderName: "Maya Patel",
      timestamp: new Date("2023-05-25T16:00:00")
    },
    {
      id: "msg3_2",
      text: "Yes! I went to the modern art museum last weekend.",
      senderId: "user4",
      senderName: "Sophie Wilson",
      timestamp: new Date("2023-05-25T16:10:00")
    },
    {
      id: "msg3_3",
      text: "Oh nice, I've been meaning to go there.",
      senderId: "user2",
      senderName: "Maya Patel",
      timestamp: new Date("2023-05-25T16:15:00")
    },
    {
      id: "msg3_4",
      text: "What do you think about the new art exhibition?",
      senderId: "user4",
      senderName: "Sophie Wilson",
      timestamp: new Date("2023-05-25T16:20:00")
    }
  ]
};

// Current mock user (as if logged in)
export const currentMockUser = {
  uid: "user1",
  displayName: "Alex Johnson",
  email: "alex@example.com",
  interests: ["music", "gaming", "technology", "travel"],
  photoURL: "https://randomuser.me/api/portraits/men/1.jpg"
};