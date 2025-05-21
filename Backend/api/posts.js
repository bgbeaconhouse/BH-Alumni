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
}).array('media', 10); // 'media' is the field name for files in the form-data

router.post("/", verifyToken, upload, async (req, res, next) => {
    try {
        const { content } = req.body;
        const files = req.files;
        const userId = req.userId;

        console.log("Request body:", req.body);
        console.log("Uploaded files:", files);

        if (!content && (!files || files.length === 0)) {
            return res.status(400).json({ error: "Post must have either content or media." });
        }

        const post = await prisma.post.create({
            data: {
                content: content,
                authorId: userId,
            },
        });

        if (files && files.length > 0) {
            const imageAttachments = [];
            const videoAttachments = [];

            for (const file of files) {
                const fileExtension = path.extname(file.originalname).toLowerCase();
                if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExtension)) {
                    imageAttachments.push({ postId: post.id, url: file.filename });
                } else if (['.mp4', '.mpeg', '.mov'].includes(fileExtension)) {
                    videoAttachments.push({ postId: post.id, url: file.filename });
                }
            }

            await prisma.postImageAttachment.createMany({
                data: imageAttachments,
            });

            await prisma.postVideoAttachment.createMany({
                data: videoAttachments,
            });
        }

        const populatedPost = await prisma.post.findUnique({
            where: { id: post.id },
            include: {
                author: true,
                imageAttachments: true,
                videoAttachments: true,
            },
        });

        res.status(201).json(populatedPost);

    } catch (error) {
        console.error("Error creating post:", error);
        next(error);
    }
});

// GET request to view all posts
router.get("/", async (req, res, next) => {
    try {
        const posts = await prisma.post.findMany({
            include: {
                author: true,
                likes: true,
                comments: {
                    include: {
                        user: true,
                    },
                },
                imageAttachments: true,
                videoAttachments: true,
            },
            orderBy: {
                createdAt: 'desc', // Order by most recent first
            },
        });
        res.status(200).json(posts);
    } catch (error) {
        console.error("Error fetching all posts:", error);
        next(error);
    }
});


// GET comments for a specific post
router.get("/:postId/comments", async (req, res, next) => {
   
    const { postId } = req.params;
    try {
        const comments = await prisma.comment.findMany({
            where: { postId: parseInt(postId) },
            include: {
    user: {
        select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
        },
    },
},
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.status(200).json(comments);
    } catch (error) {
        console.error("Error fetching comments:", error);
        next(error);
    }
});

// POST a new comment to a post
router.post("/:postId/comments", verifyToken, async (req, res, next) => {
      console.log("Request Body (comment):", req.body); 
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!content) {
        return res.status(400).json({ error: "Comment content cannot be empty." });
    }

    try {
        const newComment = await prisma.comment.create({
            data: {
                content: content,
                postId: parseInt(postId),
                userId: userId,
            },
            include: {
    user: {
        select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
        },
    },
},
        });
        res.status(201).json(newComment);
    } catch (error) {
        console.error("Error creating comment:", error);
        next(error);
    }
});

// GET likes for a specific post
router.get("/:postId/likes", async (req, res, next) => {
    const { postId } = req.params;
    try {
        const likes = await prisma.like.findMany({
            where: { postId: parseInt(postId) },
        });
        res.status(200).json(likes);
    } catch (error) {
        console.error("Error fetching likes:", error);
        next(error);
    }
});

// GET user like status for a specific post
router.get("/:postId/userLike", verifyToken, async (req, res, next) => {
    const { postId } = req.params;
    const userId = req.userId;
    try {
        const like = await prisma.like.findFirst({
            where: {
                postId: parseInt(postId),
                userId: userId,
            },
        });
        res.status(200).json({ liked: !!like }); // Return true if found, false otherwise
    } catch (error) {
        console.error("Error fetching user like status:", error);
        next(error);
    }
});

// POST endpoint to like or unlike a post
router.post("/:postId/like", verifyToken, async (req, res, next) => {
    const { postId } = req.params;
    const userId = req.userId;

    try {
        // Check if the user has already liked the post
        const existingLike = await prisma.like.findFirst({
            where: {
                postId: parseInt(postId),
                userId: userId,
            },
        });

        if (existingLike) {
            // User has already liked the post, so unlike it (delete the like)
            await prisma.like.delete({
                where: {
                    id: existingLike.id,
                },
            });
            // Get the updated likes count
            const updatedLikes = await prisma.like.findMany({
                where: { postId: parseInt(postId) },
            });
            res.status(200).json({ message: "Post unliked", liked: false, likes: updatedLikes });
        } else {
            // User has not liked the post, so like it (create a new like)
            await prisma.like.create({
                data: {
                    postId: parseInt(postId),
                    userId: userId,
                },
            });
            // Get the updated likes count
            const updatedLikes = await prisma.like.findMany({
                where: { postId: parseInt(postId) },
            });
            res.status(200).json({ message: "Post liked", liked: true, likes: updatedLikes });
        }
    } catch (error) {
        console.error("Error liking/unliking post:", error);
        next(error);
    }

    
});

// DELETE endpoint to delete a comment
router.delete("/comments/:commentId", verifyToken, async (req, res, next) => {
    const { commentId } = req.params;
    const userId = req.userId;

    try {
        // 1. Check if the comment exists
        const comment = await prisma.comment.findUnique({
            where: { id: parseInt(commentId) },
        });

        if (!comment) {
            return res.status(404).json({ error: "Comment not found." });
        }

        // 2. Check if the user is the author of the comment
        if (comment.userId !== userId) {
            return res.status(403).json({ error: "You are not authorized to delete this comment." });
        }

        // 3. Delete the comment
        await prisma.comment.delete({
            where: { id: parseInt(commentId) },
        });

        res.status(200).json({ message: "Comment deleted successfully." });
    } catch (error) {
        console.error("Error deleting comment:", error);
        next(error);
    }
});
module.exports = router;