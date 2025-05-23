const express = require("express");
const router = express.Router();
const multer = require("multer");
const prisma = require("../prisma");
const verifyToken = require("../verify");
const path = require('path');
const fs = require('fs').promises;

// Configure Multer for disk storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'uploads/';
        // Create the directory if it doesn't exist
        fs.mkdir(uploadPath, { recursive: true }).then(() => {
            cb(null, uploadPath);
        }).catch(err => cb(err));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});

// Filter function to allow only image and video files
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/mpeg', 'video/quicktime'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 } // Optional: limit file size to 10MB
}).array('media', 10); // 'media' is the field name for files

// Get all conversations of user

router.get("/", verifyToken, async (req, res, next) => {
  try {
    const conversations = await prisma.conversationMember.findMany({
      where: {
        userId: req.userId,
      },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, username: true, firstName: true, lastName: true, profilePictureUrl: true },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1, // Get the latest message
              include: {
                sender: {
                  select: { id: true, username: true, firstName: true, lastName: true, profilePictureUrl: true },
                },
                imageAttachments: true,
                videoAttachments: true,
              },
            },
          },
        },
      },
      orderBy: {
        conversation: {
          updatedAt: 'desc', // Order by most recently updated conversation
        },
      },
    });
    // Map the result to a cleaner format if needed
    const formattedConversations = conversations.map(cm => ({
      id: cm.conversation.id,
      name: cm.conversation.name,
      updatedAt: cm.conversation.updatedAt,
      lastMessage: cm.conversation.messages[0] || null,
      participants: cm.conversation.members
        .filter(member => member.userId !== req.userId) // Exclude the current user
        .map(member => member.user),
    }));
    res.json(formattedConversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    next(error);
  }
});





// Start a new conversation

router.post("/direct", verifyToken, async (req, res, next) => {
  try {
    const { otherUserId } = req.body;
    const currentUserId = req.userId;

    if (!otherUserId || parseInt(otherUserId) === currentUserId) {
      return res.status(400).json({ error: "Invalid other user ID." });
    }

    // Check if a direct conversation already exists
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          {
            members: {
              some: { userId: currentUserId },
            },
          },
          {
            members: {
              some: { userId: parseInt(otherUserId) },
            },
          },
        ],
        members: {
          every: {
            userId: { in: [currentUserId, parseInt(otherUserId)] },
          },
        },
      },
      include: {
        members: true,
      },
    });

    if (existingConversation && existingConversation.members.length === 2 && !existingConversation.name) {
      return res.status(200).json(existingConversation); // Return existing conversation
    }

    const newConversation = await prisma.conversation.create({
      data: {}, // Direct conversations don't typically have a name initially
    });

    await prisma.conversationMember.createMany({
      data: [
        { conversationId: newConversation.id, userId: currentUserId },
        { conversationId: newConversation.id, userId: parseInt(otherUserId) },
      ],
    });

    const populatedConversation = await prisma.conversation.findUnique({
      where: { id: newConversation.id },
      include: { members: { include: { user: true } } },
    });

    res.status(201).json(populatedConversation);
  } catch (error) {
    console.error("Error starting direct conversation:", error);
    next(error);
  }
});


// Send a new message to a conversation

router.post("/:conversationId/messages", verifyToken, upload, async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const files = req.files;
    const senderId = req.userId;

    if (!content && (!files || files.length === 0)) {
      return res.status(400).json({ error: "Message must have either content or media." });
    }

    const newMessage = await prisma.message.create({
      data: {
        senderId: senderId,
        content: content,
        conversationId: parseInt(conversationId),
      },
    });

    if (files && files.length > 0) {
      const imageAttachments = [];
      const videoAttachments = [];

      for (const file of files) {
        const fileExtension = path.extname(file.originalname).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExtension)) {
          imageAttachments.push({ messageId: newMessage.id, url: file.filename });
        } else if (['.mp4', '.mpeg', '.mov'].includes(fileExtension)) {
          videoAttachments.push({ messageId: newMessage.id, url: file.filename });
        }
      }

      await prisma.imageAttachment.createMany({ data: imageAttachments });
      await prisma.videoAttachment.createMany({ data: videoAttachments });
    }

    const populatedMessage = await prisma.message.findUnique({
      where: { id: newMessage.id },
      include: {
        sender: {
          select: { id: true, username: true, firstName: true, lastName: true, profilePictureUrl: true },
        },
        imageAttachments: true,
        videoAttachments: true,
      },
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error(`Error sending message to conversation ${conversationId}:`, error);
    next(error);
  }
});

// Get all messages of specific convo

router.get("/:conversationId/messages", verifyToken, async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    // Optionally verify if the current user is a member of this conversation

    const messages = await prisma.message.findMany({
      where: { conversationId: parseInt(conversationId) },
      include: {
        sender: {
          select: { id: true, username: true, firstName: true, lastName: true, profilePictureUrl: true },
        },
        imageAttachments: true,
        videoAttachments: true,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
    res.json(messages);
  } catch (error) {
    console.error(`Error fetching messages for conversation ${conversationId}:`, error);
    next(error);
  }
});

module.exports = router;