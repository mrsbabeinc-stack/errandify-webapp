import axios from 'axios';
import { generateText } from './aiClient';

export interface Event {
  id: string;
  name: string;
  description: string;
  type: 'online' | 'offline';
  location?: string;
  onlineLink?: string;
  startDate: string;
  startTime: string;
  endTime: string;
  cutoffDate: string;
  cutoffTime: string;
  cost: number;
  minPax: number;
  maxPax: number;
  currentSignups: number;
  status: 'draft' | 'active' | 'cancelled' | 'completed';
  createdAt: string;
  signups: EventSignup[];
  remindersSent: boolean;
}

export interface EventSignup {
  id: string;
  userId: string;
  userName: string;
  email: string;
  signupDate: string;
  status: 'registered' | 'attended' | 'cancelled';
  accessLink?: string; // For online events after cutoff
}

export interface EventEngagementFeature {
  name: string;
  description: string;
  icon: string;
  category: 'incentive' | 'social' | 'urgency' | 'gamification';
}

export const eventOptimizer = {
  // Generate event description with Qwen
  generateEventDescription: async (
    topic: string,
    eventType: 'online' | 'offline',
    targetAudience: string,
    token: string
  ): Promise<string> => {
    try {
      const prompt = `You are an expert event marketer. Create a compelling event description for: "${topic}"

Event Type: ${eventType === 'online' ? 'Virtual/Online' : 'In-Person/Offline'}
Target Audience: ${targetAudience}

Generate a description that:
1. Clearly explains what the event is about
2. Highlights key benefits and value
3. Shows who should attend
4. Creates excitement and urgency
5. Is 150-200 words

Tone: Warm, professional, community-focused, engaging

Respond with ONLY the event description, no quotes or extra text.`;

      const responseText = await generateText(prompt, { maxTokens: 500, temperature: 0.7 });

      return responseText || '';
    } catch (error) {
      console.error('Failed to generate description:', error);
      return '';
    }
  },

  // Generate engagement strategies
  suggestEngagementFeatures: async (
    eventName: string,
    eventType: 'online' | 'offline',
    targetAudience: string
  ): Promise<EventEngagementFeature[]> => {
    try {
      const prompt = `You are an engagement expert. Suggest 5-7 strategies to increase attendance and engagement for this event.

Event: "${eventName}"
Type: ${eventType}
Audience: ${targetAudience}

Provide strategies across these categories:
1. Incentive (rewards, discounts, points)
2. Social (community, networking, reputation)
3. Urgency (scarcity, limited spots, countdown)
4. Gamification (badges, leaderboards, challenges)

For each strategy include:
- Strategy name
- Brief description (why it works)
- How to implement
- Icon emoji

Respond with ONLY valid JSON:
{
  "features": [
    {
      "name": "Strategy Name",
      "description": "Why this works and expected impact",
      "icon": "📌",
      "category": "incentive"
    }
  ]
}`;

      const responseText = await generateText(prompt, { maxTokens: 1500, temperature: 0.7 });

      const result = responseText || '';
      if (!result) return [];

      const parsed = JSON.parse(result);
      return parsed.features || [];
    } catch (error) {
      console.error('Failed to suggest features:', error);
      return [];
    }
  },

  // Generate reminder messages
  generateReminderMessage: async (
    eventName: string,
    eventType: 'online' | 'offline',
    daysUntil: number
  ): Promise<string> => {
    try {
      const timingText =
        daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;

      const prompt = `Create a warm, engaging reminder message for an event happening ${timingText}.

Event: "${eventName}"
Type: ${eventType === 'online' ? 'Virtual' : 'In-Person'}

The message should:
1. Be friendly and warm
2. Include key details reminder
3. Create excitement
4. Have a call-to-action
5. Be 50-80 words max

${eventType === 'online' ? '✓ Mention link will be provided after registration closes' : '✓ Confirm location and time'}

Tone: Warm Kampung community style, NOT corporate

Respond with ONLY the message.`;

      const responseText = await generateText(prompt, { maxTokens: 200, temperature: 0.7 });

      return responseText || '';
    } catch (error) {
      console.error('Failed to generate reminder:', error);
      return '';
    }
  },

  // Generate promotional message for members not yet signed up
  generatePromotionalMessage: async (eventName: string, spotsLeft: number): Promise<string> => {
    try {
      const prompt = `Create a compelling promotional/FOMO message to encourage members to sign up for an event.

Event: "${eventName}"
Spots Remaining: ${spotsLeft}

The message should:
1. Create urgency (limited spots, ${spotsLeft} left)
2. Show community interest ("${Math.floor(Math.random() * 30) + 15} already signed up")
3. Highlight value/benefits
4. Have strong CTA
5. Be warm and inviting (not salesy)
6. 60-100 words

Tone: Warm, FOMO-inducing, community-focused, friendly

Respond with ONLY the promotional message.`;

      const responseText = await generateText(prompt, { maxTokens: 250, temperature: 0.8 });

      return responseText || '';
    } catch (error) {
      console.error('Failed to generate promotional message:', error);
      return '';
    }
  },

  // Calculate event metrics
  calculateEventMetrics: (event: Event) => {
    const spotsLeft = event.maxPax - event.currentSignups;
    const capacityPercent = Math.round((event.currentSignups / event.maxPax) * 100);
    const hasMinPax = event.currentSignups >= event.minPax;
    const cutoffReached = new Date() > new Date(event.cutoffDate);

    return {
      spotsLeft,
      capacityPercent,
      hasMinPax,
      cutoffReached,
      isRunning: capacityPercent > 0,
      urgencyLevel:
        capacityPercent > 90
          ? 'critical'
          : capacityPercent > 70
            ? 'high'
            : capacityPercent > 40
              ? 'medium'
              : 'low',
    };
  },

  // Format access link for online events
  generateAccessLink: (eventId: string): string => {
    return `https://errandify.sg/events/${eventId}/join?access_token=${btoa(eventId + Date.now())}`;
  },

  // Save event to localStorage
  saveEvent: (event: Event): void => {
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const existingIndex = events.findIndex((e: Event) => e.id === event.id);

    if (existingIndex >= 0) {
      events[existingIndex] = event;
    } else {
      events.push(event);
    }

    localStorage.setItem('events', JSON.stringify(events));
  },

  // Load events from localStorage
  loadEvents: (): Event[] => {
    return JSON.parse(localStorage.getItem('events') || '[]');
  },
};
