// api/conversations.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const prisma = require("../prisma");
const verifyToken = require("../verify");
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const sharp = require('sharp'); // Import sharp for image processing

// Export a function that accepts wss and connectedClients
module.exports = (wss, connectedClients, app) => { // <-- Added 'app' parameter to attach static middleware

    // Define upload directories
    const UPLOAD_DIR = 'uploads/';
    const OPTIMIZED_IMAGES_DIR = path.join(UPLOAD_DIR, 'optimized/');
    const ORIGINAL_IMAGES_DIR = path.join(UPLOAD_DIR, 'originals/'); // Optional: to keep original files

    // Ensure upload directories exist
    fs.mkdir(OPTIMIZED_IMAGES_DIR, { recursive: true }).catch(console.error);
    fs.mkdir(ORIGINAL_IMAGES_DIR, { recursive: true }).catch(console.error);

    // Configure Multer for disk storage
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            // Store original files in a separate folder
            cb(null, ORIGINAL_IMAGES_DIR);
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
            // Reject files that are not images or videos
            cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
        }
    };

 const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    // Remove limits entirely - let compression handle the size
}).array('media', 5);



const compressVideo = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .size('480x?') // More aggressive - reduce to 480p
            .videoBitrate('500k') // Lower bitrate
            .audioBitrate('64k') // Lower audio bitrate
            .fps(24) // Reduce frame rate
            .format('mp4')
            .on('end', () => {
                console.log('Video compression finished');
                resolve();
            })
            .on('error', (err) => {
                console.error('Video compression error:', err);
                reject(err);
            })
            .save(outputPath);
    });
};

    // Serve static files from the uploads directory with caching headers
    // This should ideally be done in your main app.js or server.js file once for all static assets.
    // However, for demonstration, we'll add it here.
    // Make sure 'app' (the express app instance) is passed to this module.
    if (app) {
        app.use('/uploads', express.static(UPLOAD_DIR, {
            maxAge: '1h', // Cache static files for 1 hour
            immutable: true, // Indicates that the file will not change
            setHeaders: (res, path, stat) => {
                // Set ETag for better caching validation
                res.set('ETag', `"${stat.size}-${stat.mtime.getTime()}"`);
            }
        }));
    } else {
        console.warn("Express app instance not provided. Static file serving and caching headers might not be configured correctly.");
    }





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
            const files = req.files; // This will contain the original uploaded files
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
                    const originalFilePath = file.path; // Path to the original file saved by Multer

                    if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExtension)) {
                        // Process image with sharp
                        const optimizedFilename = `optimized-${file.filename}`;
                        const optimizedFilePath = path.join(OPTIMIZED_IMAGES_DIR, optimizedFilename);
                        const fileUrl = `/uploads/optimized/${optimizedFilename}`; // URL for the optimized image

                        await sharp(originalFilePath)
                            .resize({ width: 800, withoutEnlargement: true }) // Resize to max 800px width, don't enlarge
                            .toFormat('jpeg', { quality: 80 }) // Convert to JPEG with 80% quality
                            .toFile(optimizedFilePath);

                        imageAttachments.push({ messageId: newMessage.id, url: fileUrl });
                    } else if (['.mp4', '.mpeg', '.mov'].includes(fileExtension)) {
    // NEW: Compress video files
    const compressedFilename = `compressed-${file.filename.replace(fileExtension, '.mp4')}`;
    const compressedFilePath = path.join(OPTIMIZED_IMAGES_DIR, compressedFilename);
    const fileUrl = `/uploads/optimized/${compressedFilename}`;

    try {
        await compressVideo(originalFilePath, compressedFilePath);
        videoAttachments.push({ messageId: newMessage.id, url: fileUrl });
        
        // Optional: Delete original file to save space
        await fs.unlink(originalFilePath);
        console.log('Video compressed successfully');
    } catch (compressionError) {
        console.error('Video compression failed, using original:', compressionError);
        // Fallback to original if compression fails
        const fileUrl = `/uploads/originals/${file.filename}`;
        videoAttachments.push({ messageId: newMessage.id, url: fileUrl });
    }
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

            // --- NEW: Broadcast the message via WebSocket after saving ---
            const conversationMembers = await prisma.conversationMember.findMany({
                where: { conversationId: parseInt(conversationId) },
                select: { userId: true },
            });

            const memberUserIds = new Set(conversationMembers.map(member => member.userId));

            for (const [clientId, clientWs] of connectedClients) {
                if (memberUserIds.has(clientId)) {
                    if (clientWs.readyState === clientWs.OPEN) { // Use clientWs.OPEN for consistency
                        clientWs.send(JSON.stringify({ type: 'newMessage', message: populatedMessage }));
                    }
                }
            }
            // --- END NEW ---

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

    // Start a new group conversation (or a direct one via recipientIds)
    router.post("/", verifyToken, async (req, res, next) => {
        try {
            const { recipientIds, initialMessage } = req.body;
            const currentUserId = req.userId;

            if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
                return res.status(400).json({ error: "Please provide recipient IDs." });
            }

            const allUserIds = [currentUserId, ...recipientIds.map(id => parseInt(id))];

            // Create the new conversation
            const newConversation = await prisma.conversation.create({
                data: {}, // You might add a name here for group chats
            });

            // Add members to the conversation
            const conversationMembersData = allUserIds.map(userId => ({
                conversationId: newConversation.id,
                userId: userId,
            }));
            await prisma.conversationMember.createMany({ data: conversationMembersData });

            // If there's an initial message, create it
            if (initialMessage && initialMessage.content) {
                const message = await prisma.message.create({
                    data: {
                        conversationId: newConversation.id,
                        senderId: currentUserId,
                        content: initialMessage.content,
                    },
                });

                // --- NEW: Broadcast the initial message via WebSocket if conversation is created with one ---
                const conversationMembers = await prisma.conversationMember.findMany({
                    where: { conversationId: newConversation.id },
                    select: { userId: true },
                });

                const memberUserIds = new Set(conversationMembers.map(member => member.userId));

                const populatedInitialMessage = await prisma.message.findUnique({
                    where: { id: message.id },
                    include: {
                        sender: {
                            select: { id: true, username: true, firstName: true, lastName: true, profilePictureUrl: true },
                        },
                        imageAttachments: true,
                        videoAttachments: true,
                    },
                });


                for (const [clientId, clientWs] of connectedClients) {
                    if (memberUserIds.has(clientId)) {
                        if (clientWs.readyState === clientWs.OPEN) {
                            clientWs.send(JSON.stringify({ type: 'newMessage', message: populatedInitialMessage }));
                        }
                    }
                }
                // --- END NEW ---
            }

            // Fetch the newly created conversation with its members
            const populatedConversation = await prisma.conversation.findUnique({
                where: { id: newConversation.id },
                include: { members: { include: { user: true } } },
            });

            res.status(201).json(populatedConversation);
        } catch (error) {
            console.error("Error creating conversation:", error);
            next(error);
        }
    });

    return router; // Return the configured router
}; // <-- End of the exported function