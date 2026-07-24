import db from '../db.js';
import { QwenAI } from './qwenService.js';

export interface MatchedErrand {
  id: number;
  errand_id: string;
  title: string;
  category: string;
  budget: number;
  location: string;
  deadline: string;
  difficulty?: string;
  matchScore: number;
  matchReason?: string;
}

export interface DoerProfile {
  userId: number;
  rating: number;
  completedJobs: number;
  skills: string[];
  completedCategories: { [key: string]: number };
  recentRatings: number[];
}

async function getDoerProfile(doerId: number): Promise<DoerProfile> {
  const userResult = await db.query(
    'SELECT average_rating FROM users WHERE id = $1',
    [doerId]
  );

  const jobsResult = await db.query(
    `SELECT category, COUNT(*) as count
     FROM errands
     WHERE doer_id = $1 AND status LIKE 'completed%'
     GROUP BY category`,
    [doerId]
  );

  const ratingsResult = await db.query(
    `SELECT rating FROM ratings
     WHERE ratee_id = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [doerId]
  );

  const completedCategories: { [key: string]: number } = {};
  jobsResult.rows.forEach((row: any) => {
    completedCategories[row.category] = row.count;
  });

  const recentRatings = ratingsResult.rows.map((r: any) => r.rating);
  const totalCompleted = jobsResult.rows.reduce((sum, row: any) => sum + row.count, 0);

  return {
    userId: doerId,
    rating: userResult.rows[0]?.average_rating || 3.0,
    completedJobs: totalCompleted,
    skills: Object.keys(completedCategories),
    completedCategories,
    recentRatings,
  };
}

async function getOpenErrands(limit: number = 50) {
  const result = await db.query(
    `SELECT id, errand_id, title, category, budget, location, deadline, description
     FROM errands WHERE status = 'open' ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );

  return result.rows;
}

async function calculateMatchScore(doerProfile: DoerProfile, errand: any): Promise<number> {
  try {
    const response = await QwenAI.call([
        {
          role: 'user',
          content: `Score match 0.0-1.0: Doer rating ${doerProfile.rating}, ${doerProfile.completedJobs} jobs in ${Object.keys(doerProfile.completedCategories).join(',')}. Errand: ${errand.category} \$${errand.budget}. Return only number.`,
        },
      ]);

    const score = parseFloat(response.trim());
    if (isNaN(score) || score < 0 || score > 1) return 0.5;
    return score;
  } catch (error) {
    console.error('[AI Matching] Error:', error);
    return 0.5;
  }
}

export async function getSmartMatches(doerId: number, limit: number = 10): Promise<MatchedErrand[]> {
  try {
    const doerProfile = await getDoerProfile(doerId);
    const errands = await getOpenErrands(50);

    if (errands.length === 0) return [];

    const scoredErrands = await Promise.all(
      errands.map(async (errand: any) => ({
        ...errand,
        matchScore: await calculateMatchScore(doerProfile, errand),
      }))
    );

    return scoredErrands
      .filter(e => e.matchScore > 0.5)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  } catch (error) {
    console.error('[AI Matching] Error:', error);
    return [];
  }
}

export async function getMatchScore(doerId: number, errandId: number): Promise<number> {
  try {
    const doerProfile = await getDoerProfile(doerId);
    const errandResult = await db.query(
      'SELECT id, title, category, budget, location, deadline, description FROM errands WHERE id = $1',
      [errandId]
    );

    if (errandResult.rows.length === 0) return 0;
    return await calculateMatchScore(doerProfile, errandResult.rows[0]);
  } catch (error) {
    console.error('[AI Matching] Error:', error);
    return 0;
  }
}
