
/**
 * Progressive Overload Logic
 * 
 * DOMAIN RULES:
 * 1. Progress = Increased weight, reps, volume, or better RPE/Rest.
 * 2. No weight increase if RPE >= 9 or failed session.
 * 3. No increase after 2 consecutive regressions.
 * 4. Double Progression: Max out reps before increasing weight.
 * 5. Deload: After 2 regressions or high fatigue.
 */

/**
 * Calculates total volume for a session (sets * reps * weight)
 */
export function calculateVolume(sets) {
    if (!sets || sets.length === 0) return 0;
    return sets.reduce((acc, set) => acc + (set.weight * set.reps), 0);
}

/**
 * Gets the best set from a session (highest weight, then highest reps)
 * Useful for finding "1RM" estimation or peak performance
 */
export function getBestSet(sets) {
    if (!sets || sets.length === 0) return null;
    return sets.reduce((best, current) => {
        if (!best) return current;
        if (current.weight > best.weight) return current;
        if (current.weight === best.weight && current.reps > best.reps) return current;
        return best;
    }, null);
}

/**
 * Evaluates progress between two sessions
 * @param {Array} currentSessionSets 
 * @param {Array} previousSessionSets 
 */
export function evaluateProgress(currentSessionSets, previousSessionSets) {
    if (!previousSessionSets || previousSessionSets.length === 0) {
        return { status: "new", reasons: ["First recorded session"], metrics: {} };
    }

    const currentVol = calculateVolume(currentSessionSets);
    const prevVol = calculateVolume(previousSessionSets);

    const currentBest = getBestSet(currentSessionSets);
    const prevBest = getBestSet(previousSessionSets);

    const volumeChange = currentVol - prevVol;
    const weightChange = currentBest.weight - prevBest.weight;
    const repsChange = currentBest.reps - prevBest.reps;

    // Progress Definitions
    const volumeProgress = volumeChange > 0;
    const intensityProgress = weightChange > 0 || (weightChange === 0 && repsChange > 0);

    // Check for regression
    // Relaxed criteria to avoid false positives (e.g. one missed rep or slightly less volume)
    const significantVolDrop = volumeChange < -0.20 * prevVol; // >20% drop

    if (weightChange < 0 || (weightChange === 0 && repsChange < -2) || (significantVolDrop && !intensityProgress)) {
        return {
            status: "regression",
            reasons: ["Performance decreased significantly"],
            metrics: { volumeChange, weightChange, repsChange }
        };
    }

    if (intensityProgress || volumeProgress) {
        const reasons = [];
        if (weightChange > 0) reasons.push("Increased weight");
        if (repsChange > 0 && weightChange === 0) reasons.push("Increased reps at same weight");
        if (volumeProgress && !intensityProgress) reasons.push("Increased total volume");

        return {
            status: "progress",
            reasons,
            metrics: { volumeChange, weightChange, repsChange }
        };
    }

    return {
        status: "plateau",
        reasons: ["Performance matched previous session"],
        metrics: { volumeChange, weightChange, repsChange }
    };
}

/**
 * Detects if a deload is needed based on recent history
 * @param {Array} history - Array of sessions (arrays of sets), ordered by date desc
 */
export function detectDeload(history) {
    // Need at least 2 sessions to detect a pattern
    if (history.length < 2) return false;

    // Check last 2 sessions for regression
    const lastSession = history[0];
    const prevSession = history[1];
    const prevPrevSession = history[2];

    if (!prevPrevSession) return false;

    const progress1 = evaluateProgress(lastSession, prevSession);
    const progress2 = evaluateProgress(prevSession, prevPrevSession);
    console.log("progress1", progress1)
    console.log("progress2", progress2)
    if (progress1.status === 'regression' && progress2.status === 'regression') {
        return { needed: true, reason: "Regression in last 2 consecutive sessions" };
    }

    // Check RPE if available (assuming RPE field exists in logs, defaulting to null if not)
    // If ANY set in the last 2 sessions had RPE >= 9.5 (near failure) repeatedly, logic could go here.
    // Simplifying to the prompt's rule: "RPE >= 9 for 2 sessions" - assuming avg session RPE or max RPE

    return { needed: false };
}

/**
 * Calculate confidence based on history depth and consistency
 */
export function calculateConfidence(history) {
    if (!history || history.length < 2) return 'low';
    if (history.length < 5) return 'moderate';

    // Bonus check: Consistency
    // If last 3 sessions all show progress or plateau (not regression), high confidence
    // For now, simple depth check is a good start. 
    // Let's check for erratic behavior: if 2 regressions in last 5 sessions -> moderate

    const recent = history.slice(0, 5);
    let regressions = 0;
    for (let i = 0; i < recent.length - 1; i++) {
        const evalRes = evaluateProgress(recent[i].sets, recent[i + 1].sets);
        if (evalRes.status === 'regression') regressions++;
    }

    if (regressions >= 2) return 'moderate';

    return 'high';
}

/**
 * Detects if the current session was a PR (Weight, Volume, or Reps)
 */
export function detectPR(currentSession, fullHistory) {
    if (!currentSession || !fullHistory || fullHistory.length < 2) return null;

    const currentBest = getBestSet(currentSession.sets);
    const currentVol = calculateVolume(currentSession.sets);

    if (!currentBest) return null;

    // Filter out current from history
    const previousHistory = fullHistory.slice(1);

    let isWeightPR = true;
    let isVolumePR = true;
    let isRepPR = true; // Rep max AT THIS WEIGHT

    for (const session of previousHistory) {
        const best = getBestSet(session.sets);
        const vol = calculateVolume(session.sets);

        if (best) {
            if (best.weight >= currentBest.weight) isWeightPR = false;
            // Rep PR check: if we found a set with SAME OR HIGHER weight and SAME OR HIGHER reps, it's not a rep PR
            // Strictly: Rep PR at specific weight X means we never did > reps at weight >= X.
            if (best.weight >= currentBest.weight && best.reps >= currentBest.reps) isRepPR = false;
        }
        if (vol >= currentVol) isVolumePR = false;
    }

    const prs = [];
    if (isWeightPR) prs.push({ type: 'Weight', value: `${currentBest.weight}kg` });
    else if (isRepPR) prs.push({ type: 'Rep', value: `${currentBest.reps} reps @ ${currentBest.weight}kg` });

    if (isVolumePR) prs.push({ type: 'Volume', value: `${currentVol}kg` });

    return prs.length > 0 ? prs : null;
}

/**
 * Detects systemic fatigue based on multiple exercise analysis
 * @param {Array} analyses - Array of analysis objects from getOverloadRecommendation
 */
export function detectSystemicFatigue(analyses) {
    if (!analyses || analyses.length === 0) return false;
    // If > 50% of exercises are "regression" or "deload" recommended
    const regressionCount = analyses.filter(a => a.recommendation.type === 'deload' || a.progressContext?.status === 'regression').length;
    return regressionCount / analyses.length > 0.5;
}

/**
 * Detects plateau (Updated to 3 sessions)
 */
export function detectPlateau(history) {
    if (history.length < 3) return { detected: false }; // Need 2 intervals (3 sessions) 
    // Prompt says "No progress for >= 2 consecutive sessions" -> This matches 3 data points (A->B->C all same)
    // Let's define plateau as: 3 sessions with no significant progress.

    // Check last 2 comparisons (Session 1 vs 2, Session 2 vs 3)
    const progress1 = evaluateProgress(history[0].sets, history[1].sets);
    const progress2 = evaluateProgress(history[1].sets, history[2].sets);

    if (progress1.status === 'plateau' && progress2.status === 'plateau') {
        return { detected: true, reason: "Stagnation for 3 consecutive sessions" };
    }

    return { detected: false };
}

/**
 * Main function to get recommendation
 */
export function getOverloadRecommendation(history, config = { minReps: 8, maxReps: 12, incrementKg: 2.5 }) {
    if (!history || history.length === 0) {
        return { type: "maintain", explanation: "Establish baseline.", value: null, target: null, confidence: 'low' };
    }

    // Limit analysis scope? (caller typically handles this, but we can slice)
    const recentHistory = history.slice(0, 60);

    const lastSession = recentHistory[0];
    const lastSets = lastSession.sets;
    const lastDate = lastSession.date;
    const bestSet = getBestSet(lastSets);

    // 0. Base Confidence
    let baseConfidence = calculateConfidence(recentHistory);

    // 0. Check Gap (Ramp Up) -> Proportional Logic
    const diffTime = Math.abs(new Date() - new Date(lastDate));
    const daysSinceLast = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysSinceLast >= 14) {
        let intensityFactor = 0.9;
        let gapMessage = "2 weeks";

        if (daysSinceLast > 30) {
            intensityFactor = 0.7;
            gapMessage = "over a month";
        } else if (daysSinceLast > 21) {
            intensityFactor = 0.8;
            gapMessage = "3 weeks";
        }

        const rampWeight = bestSet ? parseFloat((bestSet.weight * intensityFactor).toFixed(1)) : 0;

        return {
            type: "maintain", // using maintain type for color/grouping, but context is ramp-up
            explanation: `It's been ${gapMessage} (${daysSinceLast} days) since your last session. Perform a ramp-up session at ${intensityFactor * 100}% intensity to prevent injury.`,
            value: null,
            target: { weight: rampWeight > 0 ? rampWeight : `${intensityFactor * 100}%`, reps: config.minReps, sets: 3 },
            confidence: 'high'
        };
    }

    // 1. Check Deload
    const deloadCheck = detectDeload(recentHistory.map(h => h.sets));

    if (deloadCheck.needed) {
        let explanation = `${deloadCheck.reason}. Reduce volume/intensity.`;
        let target = { weight: "Unknown", reps: "Unknown", sets: "2-3" };
        let value = -0.15;

        if (bestSet && bestSet.weight > 0) {
            const deloadWeight = parseFloat((bestSet.weight * 0.9).toFixed(1));
            explanation = `${deloadCheck.reason}. Deload to recover.`;
            target = { weight: deloadWeight, reps: bestSet.reps, sets: "2-3" };
            value = deloadWeight;
        }

        return {
            type: "deload",
            explanation,
            value,
            target,
            confidence: 'high'
        };
    }

    // 2. Analyze Performance
    if (!bestSet) return { type: "maintain", explanation: "No valid sets.", target: null, confidence: 'low' };

    // Check PR
    const prInfo = detectPR(lastSession, recentHistory);

    // Check RPE
    const maxRPE = Math.max(...lastSets.map(s => s.rpe || 0));
    if (maxRPE >= 9) {
        return {
            type: "maintain",
            explanation: "High RPE detected. Maintain to consolidate strength.",
            value: null,
            target: { weight: bestSet.weight, reps: bestSet.reps, sets: lastSets.length },
            confidence: baseConfidence,
            prInfo
        };
    }

    // 3. Double Progression
    const bestSetHitTarget = bestSet.reps >= config.maxReps;

    if (bestSetHitTarget) {
        // Validation: Stricter Check - Average reps of working sets must hit target
        const workingSets = lastSets.filter(s => s.weight >= bestSet.weight * 0.95);

        if (workingSets.length > 0) {
            const totalReps = workingSets.reduce((sum, s) => sum + s.reps, 0);
            const avgReps = totalReps / workingSets.length;

            if (avgReps >= config.maxReps) {
                const newWeight = bestSet.weight + config.incrementKg;
                return {
                    type: "weight",
                    value: config.incrementKg,
                    explanation: `Excellent! Average reps (${avgReps.toFixed(1)}) on heavy sets met the target (${config.maxReps}). Increase weight.`,
                    target: { weight: newWeight, reps: config.minReps, sets: lastSets.length },
                    confidence: baseConfidence === 'low' ? 'moderate' : 'high',
                    prInfo
                };
            } else {
                return {
                    type: "maintain",
                    explanation: `Best set hit target, but average reps (${avgReps.toFixed(1)}) is below ${config.maxReps}. Maintain weight and build density only when all sets are strong.`,
                    value: null,
                    target: { weight: bestSet.weight, reps: config.maxReps, sets: lastSets.length },
                    confidence: 'high',
                    prInfo
                };
            }
        }
    }

    // 4. Plateau Check
    const plateauCheck = detectPlateau(recentHistory.map(h => h.sets));
    if (plateauCheck.detected) {
        return {
            type: "reps",
            explanation: "Plateau detected. Add 1 rep or slow down tempo.",
            value: 1,
            target: { weight: bestSet.weight, reps: bestSet.reps + 1, sets: lastSets.length },
            confidence: baseConfidence,
            prInfo
        };
    }

    // 5. Default: Add Reps
    return {
        type: "reps",
        value: 1,
        explanation: "Build volume. Add reps.",
        target: { weight: bestSet.weight, reps: Math.min(bestSet.reps + 1, config.maxReps), sets: lastSets.length },
        confidence: baseConfidence,
        prInfo
    };
}
