import Task from '../models/Task.js';
import User from '../models/User.js';
import { generateInstantContract } from '../utils/contractGenerator.js';

// ====================
// GENERATE CONTRACT PDF
// ====================
export const generateContract = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;

    // Find the task
    const task = await Task.findById(taskId)
      .populate('postedBy', 'name businessProfile.businessName')
      .populate('assignedTo', 'name');

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // Verify user is either the business or the assigned fresher
    const isBusiness = task.postedBy._id.toString() === userId.toString();
    const isFresher = task.assignedTo && task.assignedTo._id.toString() === userId.toString();

    if (!isBusiness && !isFresher) {
      return res.status(403).json({
        status: 'error',
        message: 'Only task participants can generate contracts',
      });
    }

    // Get names
    const businessName = task.postedBy.businessProfile?.businessName || task.postedBy.name;
    const fresherName = task.assignedTo?.name || 'TBD';

    // Task details for contract
    const taskDetails = {
      title: task.title,
      description: task.description,
      workScale: task.workScale,
      budget: task.budget,
      deadline: task.deadline,
      skillsRequired: task.skillsRequired,
    };

    // Generate PDF
    const pdfBuffer = await generateInstantContract(taskDetails, fresherName, businessName);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="LUMINTERN-Contract-${taskId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// ====================
// GET CONTRACT DETAILS
// ====================
export const getContractDetails = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;

    const task = await Task.findById(taskId)
      .populate('postedBy', 'name email businessProfile')
      .populate('assignedTo', 'name email fresherProfile');

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // Verify user is a participant
    const isBusiness = task.postedBy._id.toString() === userId.toString();
    const isFresher = task.assignedTo && task.assignedTo._id.toString() === userId.toString();

    if (!isBusiness && !isFresher) {
      return res.status(403).json({
        status: 'error',
        message: 'Only task participants can view contract details',
      });
    }

    const contractId = `LUM-${task._id.toString().slice(-8).toUpperCase()}`;

    res.status(200).json({
      status: 'success',
      data: {
        contract: {
          contractId,
          task: {
            _id: task._id,
            title: task.title,
            description: task.description,
            workScale: task.workScale,
            budget: task.budget,
            deadline: task.deadline,
            status: task.status,
            paymentStatus: task.paymentStatus,
          },
          business: {
            name: task.postedBy.businessProfile?.businessName || task.postedBy.name,
            email: task.postedBy.email,
          },
          fresher: {
            name: task.assignedTo?.name || 'TBD',
            email: task.assignedTo?.email,
          },
          terms: {
            escrowProtection: true,
            autoReleaseHours: 72,
            disputeResolution: 'Admin mediation available',
          },
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};