import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

// Register a new user
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, fresherProfile, businessProfile } =
      req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already registered. Please use a different email.',
      });
    }

    // Create user object based on role
    const userData = {
      name,
      email,
      password,
      role,
    };

    // Add role-specific profile data
    if (role === 'fresher') {
      if (!fresherProfile) {
        return res.status(400).json({
          status: 'error',
          message: 'Fresher profile details are required',
        });
      }
      userData.fresherProfile = {
        college: fresherProfile.college,
        yearOfStudy: fresherProfile.yearOfStudy,
        skills: fresherProfile.skills || [],
        preferredWorkScale: fresherProfile.preferredWorkScale || 'both',
        portfolioLinks: fresherProfile.portfolioLinks || [],
      };
    } else if (role === 'business') {
      if (!businessProfile) {
        return res.status(400).json({
          status: 'error',
          message: 'Business profile details are required',
        });
      }
      userData.businessProfile = {
        businessName: businessProfile.businessName,
        businessType: businessProfile.businessType,
        phone: businessProfile.phone,
        address: businessProfile.address,
      };
    }

    // Create new user
    const newUser = await User.create(userData);

    // Generate JWT token
    const token = generateToken(newUser._id);

    // Update last login
    newUser.lastLogin = new Date();
    await newUser.save({ validateBeforeSave: false });

    // Remove password from output
    newUser.password = undefined;

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: newUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login user
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password',
      });
    }

    // 2) Check if user exists and password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password',
      });
    }

    // 3) Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'This account has been deactivated. Please contact support.',
      });
    }

    // 4) Generate JWT token
    const token = generateToken(user._id);

    // 5) Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // 6) Remove password from output
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get current user profile
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update current user profile
export const updateMe = async (req, res, next) => {
  try {
    // 1) Create error if user POSTs password data
    if (req.body.password) {
      return res.status(400).json({
        status: 'error',
        message:
          'This route is not for password updates. Please use /updatePassword.',
      });
    }

    // 2) Filtered out unwanted fields
    const filteredBody = {};
    const allowedFields = ['name', 'email'];

    allowedFields.forEach((field) => {
      if (req.body[field]) filteredBody[field] = req.body[field];
    });

    // 3) Update role-specific profile
    if (req.user.role === 'fresher' && req.body.fresherProfile) {
      filteredBody.fresherProfile = {
        ...req.user.fresherProfile.toObject(),
        ...req.body.fresherProfile,
      };
    } else if (req.user.role === 'business' && req.body.businessProfile) {
      filteredBody.businessProfile = {
        ...req.user.businessProfile.toObject(),
        ...req.body.businessProfile,
      };
    }

    // 4) Update user document
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update password
export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 1) Get user from collection
    const user = await User.findById(req.user._id).select('+password');

    // 2) Check if current password is correct
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({
        status: 'error',
        message: 'Your current password is incorrect',
      });
    }

    // 3) Update password
    user.password = newPassword;
    await user.save();

    // 4) Generate new token
    const token = generateToken(user._id);

    res.status(200).json({
      status: 'success',
      token,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};