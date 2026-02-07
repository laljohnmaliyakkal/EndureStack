
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
    if (!history || history.length < 2) return { needed: false };

    const lastSession = history[0]; // { sets: [...] } or just sets if mapped. 
    // Handle both extraction cases for backward compatibility if needed, 
    // but better to assume getOverloadRecommendation passes full history objects now.
    // Let's assume we update call site to pass full history.

    // Extract sets helper
    const getSets = (item) => item.sets || item;

    const s1 = getSets(history[0]);
    const s2 = getSets(history[1]);
    const s3 = history[2] ? getSets(history[2]) : null;

    // 1. Regression Check (2 consecutive regressions)
    if (s3) {
        const p1 = evaluateProgress(s1, s2);
        const p2 = evaluateProgress(s2, s3);
        if (p1.status === 'regression' && p2.status === 'regression') {
            return { needed: true, reason: "Regression in last 2 consecutive sessions" };
        }
    }

    // 2. Plateau Check (3+ sessions stuck)
    // Means last 2 intervals were plateaus
    if (s3) {
        const p1 = evaluateProgress(s1, s2);
        const p2 = evaluateProgress(s2, s3);
        if (p1.status === 'plateau' && p2.status === 'plateau') {
            // User requested Deload on 3+ session plateau
            return { needed: true, reason: "Stalled for 3 consecutive sessions (Plateau)" };
        }
    }

    // 3. High RPE Check (Average RPE >= 9 for last 2 sessions)
    const getAvgRPE = (sets) => {
        if (!sets || sets.length === 0) return 0;
        const validRPEs = sets.filter(s => s.rpe).map(s => s.rpe);
        if (validRPEs.length === 0) return 0;
        return validRPEs.reduce((a, b) => a + b, 0) / validRPEs.length;
    };

    const rpe1 = getAvgRPE(s1);
    const rpe2 = getAvgRPE(s2);

    if (rpe1 >= 9 && rpe2 >= 9) {
        return { needed: true, reason: "High exertion (RPE ≥ 9) for 2 consecutive sessions" };
    }

    // 4. Volume Spike Check (>20% jump from previous)
    const v1 = calculateVolume(s1);
    const v2 = calculateVolume(s2);
    if (v2 > 0 && v1 > v2 * 1.2) {
        return { needed: true, reason: "Volume spiked >20% compared to last session" };
    }

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

    // Hierarchy: Weight > Rep > Volume
    if (isWeightPR) {
        prs.push({ type: 'Weight', value: `${currentBest.weight}kg` });
    }
    else if (isRepPR) {
        prs.push({ type: 'Rep', value: `${currentBest.reps} reps @ ${currentBest.weight}kg` });
    }
    else if (isVolumePR) {
        prs.push({ type: 'Volume', value: `${currentVol}kg` });
    }

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
    if (history.length < 3) return { detected: false };

    // Extract sets helper
    const getSets = (item) => item.sets || item;

    // Compare Session 1 (Latest) vs Session 3 (Oldest in window)
    const s1 = getSets(history[0]);
    const s3 = getSets(history[2]);

    if (!s1 || !s3 || s1.length === 0 || s3.length === 0) return { detected: false };

    const best1 = getBestSet(s1);
    const best3 = getBestSet(s3);
    const vol1 = calculateVolume(s1);
    const vol3 = calculateVolume(s3);

    if (!best1 || !best3) return { detected: false };

    // 1. No Weight Increase
    // If best weight in S1 is <= best weight in S3
    const weightGain = best1.weight - best3.weight;

    // 2. Volume Stagnation (<3% improvement)
    let volChangePercent = 0;
    if (vol3 > 0) {
        volChangePercent = (vol1 - vol3) / vol3;
    }

    // Condition: No meaningful weight increase AND volume improved less than 3%
    if (weightGain <= 0 && volChangePercent < 0.03) {
        return { detected: true, reason: "Stalled progress (<3% volume gain) over last 3 sessions" };
    }

    return { detected: false };
}

/**
 * Main function to get recommendation
 */
export function getOverloadRecommendation(history, config = { minReps: 12, maxReps: 15, incrementKg: 2.5 }) {
    if (!history || history.length < 2) {
        return { type: "maintain", explanation: "Need at least 2 sessions to establish a baseline and generate accurate recommendations.", value: null, target: null, confidence: 'low' };
    }

    // Limit analysis scope? (caller typically handles this, but we can slice)
    const recentHistory = history.slice(0, 12);

    const lastSession = recentHistory[0];
    const lastSets = lastSession.sets;
    const lastDate = lastSession.date;
    const bestSet = getBestSet(lastSets);

    // 0. Base Confidence
    let baseConfidence = calculateConfidence(recentHistory);

    // X. Cardio Logic
    if (config.muscleGroup === 'Cardio') {
        const lastDuration = lastSets.reduce((sum, s) => sum + s.reps, 0); // "Reps" = Minutes
        const lastIntensity = lastSets.length > 0
            ? lastSets.reduce((sum, s) => sum + s.weight, 0) / lastSets.length // "Weight" = Level/Speed
            : 0;

        // Simple Progression: Add 5-10% duration until 45 mins, then intensity
        if (lastDuration < 45) {
            const newDuration = Math.ceil(lastDuration * 1.1); // +10%
            return {
                type: 'cardio',
                explanation: `Build endurance. Increase duration to ${newDuration} mins.`,
                value: newDuration - lastDuration,
                target: { weight: lastIntensity, reps: newDuration, sets: 1 },
                confidence: baseConfidence,
                prInfo: detectPR(lastSession, recentHistory)
            };
        } else {
            // Intensity increase
            const newIntensity = parseFloat((lastIntensity + 0.5).toFixed(1));
            return {
                type: 'cardio',
                explanation: `Duration good (${lastDuration}m). Increase intensity/speed/incline.`,
                value: 0.5,
                target: { weight: newIntensity, reps: lastDuration, sets: 1 },
                confidence: baseConfidence,
                prInfo: detectPR(lastSession, recentHistory)
            };
        }
    }

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
    const deloadCheck = detectDeload(recentHistory);

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
    const prInfo = detectPR(lastSession, history);

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
    const plateauCheck = detectPlateau(recentHistory);
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
