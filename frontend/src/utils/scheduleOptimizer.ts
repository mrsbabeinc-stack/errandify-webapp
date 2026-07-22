import axios from 'axios';
import { generateText } from './aiClient';

export interface ScheduleSuggestion {
  date: string;
  time: string;
  reason: string;
  expectedEngagement: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
}

export interface SchedulePlan {
  period: '3-months' | '6-months';
  suggestions: ScheduleSuggestion[];
  frequencyRecommendation: string;
  engagementScore: number;
}

export const scheduleOptimizer = {
  // Get AI-suggested optimal posting times
  getOptimalSchedule: async (
    contentType: 'email' | 'blog',
    targetAudience: string,
    contentTopic: string,
    token: string
  ): Promise<SchedulePlan | null> => {
    try {
      const prompt = `You are a content scheduling expert. Suggest optimal posting dates and times for ${contentType} ${contentTopic} targeting ${targetAudience}.

Analyze engagement patterns and suggest:
1. Best dates/times to post (consider time zones: 8-10am, 12-2pm, 5-7pm SGT)
2. Optimal frequency (weekly, biweekly, monthly)
3. 3-month and 6-month posting calendar
4. Expected engagement score (0-100)

For 3-month plan, suggest 4-6 posts. For 6-month plan, suggest 8-12 posts.

Respond with ONLY valid JSON:
{
  "period": "3-months",
  "suggestions": [
    {
      "date": "2026-07-21",
      "time": "09:00",
      "reason": "Tuesday mornings have 34% higher engagement",
      "expectedEngagement": 75,
      "frequency": "weekly"
    }
  ],
  "frequencyRecommendation": "Post 2x per week for maximum reach without audience fatigue",
  "engagementScore": 78
}`;

      const responseText = await generateText(prompt, { maxTokens: 1500, temperature: 0.7 });

      const result = responseText || '';
      if (!result) return null;

      const parsed = JSON.parse(result);
      return parsed as SchedulePlan;
    } catch (error) {
      console.error('[Schedule] Failed to get optimal schedule:', error);
      return null;
    }
  },

  // Generate calendar events from schedule plan
  generateCalendarEvents: (plan: SchedulePlan): CalendarEvent[] => {
    return plan.suggestions.map((suggestion, idx) => ({
      id: `event_${Date.now()}_${idx}`,
      date: suggestion.date,
      time: suggestion.time,
      title: `Scheduled Post (${suggestion.frequency})`,
      description: suggestion.reason,
      engagement: suggestion.expectedEngagement,
      type: 'scheduled-post',
    }));
  },

  // Get frequency recommendation for period
  getFrequencyForPeriod: (period: '3-months' | '6-months'): string => {
    return period === '3-months'
      ? '4-6 posts recommended (1-2 posts per month)'
      : '8-12 posts recommended (1-2 posts per month, consistent)';
  },

  // Create reminders for upcoming posts
  createPostReminders: (events: CalendarEvent[]): Reminder[] => {
    return events.map(event => ({
      id: `reminder_${event.id}`,
      eventId: event.id,
      date: event.date,
      time: event.time,
      reminderTimes: [
        { offset: -7 * 24 * 60, label: '1 week before' },
        { offset: -2 * 24 * 60, label: '2 days before' },
        { offset: -24 * 60, label: '1 day before' },
        { offset: -2 * 60, label: '2 hours before' },
      ],
      sent: false,
    }));
  },

  // Format date for display
  formatPostDate: (date: string, time: string): string => {
    const dateObj = new Date(`${date}T${time}:00`);
    return dateObj.toLocaleString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  },

  // Get days until post
  daysUntilPost: (date: string): number => {
    const postDate = new Date(date);
    const today = new Date();
    const diffTime = postDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  // Save schedule plan to localStorage
  savePlan: (key: string, plan: SchedulePlan): void => {
    localStorage.setItem(`${key}_schedule`, JSON.stringify(plan));
  },

  // Load schedule plan from localStorage
  loadPlan: (key: string): SchedulePlan | null => {
    const saved = localStorage.getItem(`${key}_schedule`);
    return saved ? JSON.parse(saved) : null;
  },
};

export interface CalendarEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  description: string;
  engagement: number;
  type: 'scheduled-post' | 'reminder' | 'maintenance';
}

export interface Reminder {
  id: string;
  eventId: string;
  date: string;
  time: string;
  reminderTimes: { offset: number; label: string }[];
  sent: boolean;
}
