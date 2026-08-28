import User from '../models/User.js';

// ====================
// GAMIFICATION CONSTANTS
// ====================
export const XP_PER_TASK = 100;
export const XP_THRESHOLDS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 500 },
  { level: 3, xp: 1200 },
  { level: 4, xp: 2000 },
  { level: 5, xp: 3500 },
  { level: 6, xp: 5000 },
  { level: 7, xp: 7500 },
  { level: 8, xp: 10000 },
  { level: 9, xp: 15000 },
  { level: 10, xp: 20000 },
];

// ====================
// CALCULATE LEVEL FROM XP
// ====================
export const calculateLevel = (xp) => {
  let level = 1;
  for (const threshold of XP_THRESHOLDS) {
    if (xp >= threshold.xp) {
      level = threshold.level;
    } else {
      break;
    }
  }
  return level;
};

// ====================
// GET XP FOR NEXT LEVEL
// ====================
export const getXPForNextLevel = (currentLevel) => {
  const nextThreshold = XP_THRESHOLDS.find((t) => t.level === currentLevel + 1);
  return nextThreshold ? nextThreshold.xp : null;
};

// ====================
// GET LEVEL PROGRESS
// ====================
export const getLevelProgress = (xp, currentLevel) => {
  const currentThreshold = XP_THRESHOLDS.find((t) => t.level === currentLevel);
  const nextThreshold = XP_THRESHOLDS.find((t) => t.level === currentLevel + 1);

  if (!currentThreshold || !nextThreshold) {
    return { progress: 100, xpNeeded: 0 };
  }

  const xpInCurrentLevel = xp - currentThreshold.xp;
  const xpNeededForLevel = nextThreshold.xp - currentThreshold.xp;
  const progress = Math.round((xpInCurrentLevel / xpNeededForLevel) * 100);

  return {
    progress: Math.min(progress, 100),
    xpNeeded: nextThreshold.xp - xp,
    currentLevelXP: currentThreshold.xp,
    nextLevelXP: nextThreshold.xp,
  };
};

// ====================
// AWARD XP TO FRESHER
// ====================
export const awardXP = async (fresherId, xpAmount = XP_PER_TASK, reason = 'Task completed') => {
  try {
    const user = await User.findById(fresherId);
    
    if (!user || user.role !== 'fresher') {
      return null;
    }

    const previousXP = user.fresherProfile.experiencePoints;
    const previousLevel = user.fresherProfile.platformLevel;
    const newXP = previousXP + xpAmount;
    const newLevel = calculateLevel(newXP);
    const leveledUp = newLevel > previousLevel;

    // Update user with atomic operation
    const updatedUser = await User.findByIdAndUpdate(
      fresherId,
      {
        $inc: { 'fresherProfile.experiencePoints': xpAmount },
        $set: { 'fresherProfile.platformLevel': newLevel },
      },
      { new: true }
    );

    return {
      previousXP,
      newXP,
      xpGained: xpAmount,
      previousLevel,
      newLevel,
      leveledUp,
      levelProgress: getLevelProgress(newXP, newLevel),
    };
  } catch (error) {
    console.error('Error awarding XP:', error);
    return null;
  }
};

// ====================
// GET LEVEL TITLE
// ====================
export const getLevelTitle = (level) => {
  const titles = {
    1: 'Newcomer',
    2: 'Apprentice',
    3: 'Contributor',
    4: 'Specialist',
    5: 'Expert',
    6: 'Master',
    7: 'Veteran',
    8: 'Champion',
    9: 'Legend',
    10: 'Grandmaster',
  };
  return titles[level] || 'Newcomer';
};

// ====================
// GET LEVEL BADGE COLOR
// ====================
export const getLevelBadgeColor = (level) => {
  if (level >= 9) return { bg: 'from-yellow-500 to-amber-600', text: 'text-yellow-100' };
  if (level >= 7) return { bg: 'from-purple-500 to-indigo-600', text: 'text-purple-100' };
  if (level >= 5) return { bg: 'from-electric to-cyan-600', text: 'text-cyan-100' };
  if (level >= 3) return { bg: 'from-green-500 to-emerald-600', text: 'text-green-100' };
  return { bg: 'from-gray-500 to-slate-600', text: 'text-gray-100' };
};

export default {
  XP_PER_TASK,
  XP_THRESHOLDS,
  calculateLevel,
  getXPForNextLevel,
  getLevelProgress,
  awardXP,
  getLevelTitle,
  getLevelBadgeColor,
};