import User from '../models/User.js';
import {
  getLevelProgress,
  getLevelTitle,
  getLevelBadgeColor,
  XP_THRESHOLDS,
} from '../utils/gamification.js';

// ====================
// GET GAMIFICATION PROFILE
// ====================
export const getGamificationProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('fresherProfile.experiencePoints fresherProfile.platformLevel fresherProfile.completedTasks');

    if (!user || user.role !== 'fresher') {
      return res.status(403).json({
        status: 'error',
        message: 'Only freshers have gamification profiles',
      });
    }

    const xp = user.fresherProfile.experiencePoints;
    const level = user.fresherProfile.platformLevel;
    const levelProgress = getLevelProgress(xp, level);
    const levelTitle = getLevelTitle(level);
    const badgeColor = getLevelBadgeColor(level);

    res.status(200).json({
      status: 'success',
      data: {
        gamification: {
          experiencePoints: xp,
          platformLevel: level,
          levelTitle,
          badgeColor,
          completedTasks: user.fresherProfile.completedTasks,
          progress: levelProgress,
          allLevels: XP_THRESHOLDS,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// GET LEADERBOARD
// ====================
export const getLeaderboard = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const leaderboard = await User.find({ role: 'fresher', isActive: true })
      .select('name fresherProfile.experiencePoints fresherProfile.platformLevel fresherProfile.completedTasks fresherProfile.college')
      .sort({ 'fresherProfile.experiencePoints': -1 })
      .limit(Number(limit));

    const formattedLeaderboard = leaderboard.map((user, index) => ({
      rank: index + 1,
      name: user.name,
      xp: user.fresherProfile.experiencePoints,
      level: user.fresherProfile.platformLevel,
      levelTitle: getLevelTitle(user.fresherProfile.platformLevel),
      completedTasks: user.fresherProfile.completedTasks,
      college: user.fresherProfile.college,
    }));

    res.status(200).json({
      status: 'success',
      data: { leaderboard: formattedLeaderboard },
    });
  } catch (error) {
    next(error);
  }
};