const REASON_CODE_MAP = {
    // Search reasons
    semantic_match_pet_care: {
        code: 'semantic_match_pet_care',
        category: 'match',
        human_readable: 'Semantic match for pet care category',
        confidence_impact: 'high',
        user_facing: 'This errand matches your search for pet care services',
    },
    semantic_match_cleaning: {
        code: 'semantic_match_cleaning',
        category: 'match',
        human_readable: 'Semantic match for cleaning category',
        confidence_impact: 'high',
        user_facing: 'This errand matches your search for cleaning services',
    },
    title_keyword_match: {
        code: 'title_keyword_match',
        category: 'match',
        human_readable: 'Direct keyword match in title',
        confidence_impact: 'high',
        user_facing: 'This errand title matches your search',
    },
    description_keyword_match: {
        code: 'description_keyword_match',
        category: 'match',
        human_readable: 'Keyword found in description',
        confidence_impact: 'medium',
        user_facing: 'This errand mentions what you searched for',
    },
    // Job recommendation reasons
    high_skill_fit: {
        code: 'high_skill_fit',
        category: 'rank',
        human_readable: 'High skill match with errand requirements',
        confidence_impact: 'high',
        user_facing: 'Your skills match this errand well',
    },
    category_preference_match: {
        code: 'category_preference_match',
        category: 'match',
        human_readable: 'Errand category matches your preferences',
        confidence_impact: 'high',
        user_facing: 'This errand is in your preferred category',
    },
    high_rating_history: {
        code: 'high_rating_history',
        category: 'rank',
        human_readable: 'Excellent completion and rating history',
        confidence_impact: 'high',
        user_facing: 'You have a strong track record with similar work',
    },
    close_proximity: {
        code: 'close_proximity',
        category: 'rank',
        human_readable: 'Errand location is close to your service area',
        confidence_impact: 'medium',
        user_facing: 'This errand is near your location',
    },
    good_responsiveness: {
        code: 'good_responsiveness',
        category: 'rank',
        human_readable: 'History of quick responses to bids',
        confidence_impact: 'medium',
        user_facing: 'You usually respond quickly to opportunities',
    },
    budget_fit: {
        code: 'budget_fit',
        category: 'rank',
        human_readable: 'Budget matches your typical rates',
        confidence_impact: 'low',
        user_facing: 'The budget is reasonable for this type of work',
    },
    // CHAS verification reasons
    chas_blue_eligible: {
        code: 'chas_blue_eligible',
        category: 'match',
        human_readable: 'Income qualifies for CHAS Blue Card',
        confidence_impact: 'high',
        user_facing: 'Your income qualifies for CHAS Blue Card (25% subsidy)',
    },
    chas_green_eligible: {
        code: 'chas_green_eligible',
        category: 'match',
        human_readable: 'Income qualifies for CHAS Green Card',
        confidence_impact: 'high',
        user_facing: 'Your income qualifies for CHAS Green Card (15% subsidy)',
    },
    income_above_limit: {
        code: 'income_above_limit',
        category: 'filter',
        human_readable: 'Income exceeds CHAS eligibility',
        confidence_impact: 'high',
        user_facing: 'Your income is above the CHAS eligibility threshold',
    },
    income_verification_pending: {
        code: 'income_verification_pending',
        category: 'alert',
        human_readable: 'Income claim requires manual verification',
        confidence_impact: 'medium',
        user_facing: 'Your income claim is being reviewed by our team',
    },
    // Recurrence pattern reasons
    similar_errands_daily: {
        code: 'similar_errands_daily',
        category: 'match',
        human_readable: 'Similar errands in your history are daily',
        confidence_impact: 'high',
        user_facing: 'Similar tasks are typically done daily',
    },
    similar_errands_weekly: {
        code: 'similar_errands_weekly',
        category: 'match',
        human_readable: 'Similar errands in your history are weekly',
        confidence_impact: 'high',
        user_facing: 'Similar tasks are typically done weekly',
    },
    similar_errands_monthly: {
        code: 'similar_errands_monthly',
        category: 'match',
        human_readable: 'Similar errands in your history are monthly',
        confidence_impact: 'high',
        user_facing: 'Similar tasks are typically done monthly',
    },
    pattern_suggestion_confidence_low: {
        code: 'pattern_suggestion_confidence_low',
        category: 'alert',
        human_readable: 'Low confidence in pattern suggestion',
        confidence_impact: 'low',
        user_facing: 'We don\'t have enough data to suggest a pattern',
    },
    // Alert/bias reasons
    suspicious_profile_data: {
        code: 'suspicious_profile_data',
        category: 'alert',
        human_readable: 'Profile data inconsistency detected',
        confidence_impact: 'high',
        user_facing: 'Your profile information needs review',
    },
    potential_bias_detected: {
        code: 'potential_bias_detected',
        category: 'alert',
        human_readable: 'Potential bias in matching detected',
        confidence_impact: 'medium',
        user_facing: 'This ranking was audited for fairness',
    },
    content_moderation_warning: {
        code: 'content_moderation_warning',
        category: 'alert',
        human_readable: 'Content moderation flagged this errand',
        confidence_impact: 'high',
        user_facing: 'This errand posting is under review',
    },
    // Errors
    moderation_check_failed: {
        code: 'moderation_check_failed',
        category: 'error',
        human_readable: 'Content moderation check failed',
        confidence_impact: 'low',
        user_facing: 'We couldn\'t verify this posting, please try again',
    },
};
export function getReasonExplanation(code) {
    return (REASON_CODE_MAP[code] || {
        code,
        category: 'error',
        human_readable: 'Unknown reason',
        confidence_impact: 'low',
        user_facing: 'This recommendation is based on our algorithm',
    });
}
export function formatReasonForUser(code) {
    const explanation = getReasonExplanation(code);
    return explanation.user_facing;
}
export function getAllReasonCodes() {
    return REASON_CODE_MAP;
}
export function getReasonsByCategory(category) {
    return Object.entries(REASON_CODE_MAP)
        .filter(([, reason]) => reason.category === category)
        .map(([code, reason]) => ({ code, ...reason }));
}
export function buildExplainableResponse(result, reasonCodes) {
    const explanations = reasonCodes.map((code) => ({
        code,
        user_facing: formatReasonForUser(code),
    }));
    return {
        result,
        explanation: explanations.map((e) => e.user_facing).join(' + '),
        reason_codes: explanations,
    };
}
