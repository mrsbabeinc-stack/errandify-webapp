// User and Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'asker' | 'doer';
  age?: number;
  profileImage?: string;
  singpassId?: string; // When USE_SINGPASS is true
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

// Errand Types
export interface Errand {
  id: string;
  askerId: string;
  title: string;
  description: string;
  category: string;
  status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  budget?: number;
  deadline?: Date;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ErrandAssignment {
  id: string;
  errandId: string;
  doerId: string;
  status: 'accepted' | 'declined' | 'completed' | 'cancelled';
  completedAt?: Date;
  ratingScore?: number;
  ratingComment?: string;
}

// Chat Types
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  audioUrl?: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  errandId?: string;
  lastMessageAt: Date;
  createdAt: Date;
}

// Role Types
export type UserRole = 'asker' | 'doer';

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
