const express = require("express");
const router = express.Router();
const multer = require("multer");
const prisma = require("../prisma");
const verifyToken = require("../verify");
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp'); // Add Sharp for image optimization

// Configure Multer for disk storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
       const uploadPath = '/mnt/disks/uploads/';
        // Create the directory if it doesn't exist
        fs.mkdir(uploadPath, { recursive: true }).then(() => {
            // Also create optimized directory for future use
            return fs.mkdir('/mnt/disks/uploads/optimized/', { recursive: true });
        }).then(() => {
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
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
}).array('media', 10);

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
                    // Create optimized versions but don't save to database yet
                    try {
                        const optimizedFilename = `optimized-${file.filename}`;
                        const optimizedFilePath = path.join('/mnt/disks/uploads/optimized/', optimizedFilename);
                        
                        // Create optimized image with Sharp
                        await sharp(file.path)
                            .resize({ 
                                width: 800, 
                                height: 800, 
                                fit: 'inside',
                                withoutEnlargement: true 
                            })
                            .jpeg({ 
                                quality: 80,
                                progressive: true
                            })
                            .toFile(optimizedFilePath);

                        // Create thumbnail (200x200) for faster loading
                        const thumbnailFilename = `thumb-${file.filename}`;
                        const thumbnailFilePath = path.join('/mnt/disks/uploads/optimized/', thumbnailFilename);
                        
                        await sharp(file.path)
                            .resize(200, 200, { 
                                fit: 'cover',
                                position: 'center' 
                            })
                            .jpeg({ 
                                quality: 70,
                                progressive: true
                            })
                            .toFile(thumbnailFilePath);

                        console.log(`Created optimized versions for ${file.filename}`);
                    } catch (optimizationError) {
                        console.error("Image optimization failed:", optimizationError);
                    }

                    // Save to database with current schema (only original URL)
                    imageAttachments.push({ 
                        postId: post.id, 
                        url: file.filename
                    });
                } else if (['.mp4', '.mpeg', '.mov'].includes(fileExtension)) {
                    videoAttachments.push({ postId: post.id, url: file.filename });
                }
            }

            if (imageAttachments.length > 0) {
                await prisma.postImageAttachment.createMany({
                    data: imageAttachments,
                });
            }

            if (videoAttachments.length > 0) {
                await prisma.postVideoAttachment.createMany({
                    data: videoAttachments,
                });
            }
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

// GET request to view all posts with pagination
router.get("/", async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const posts = await prisma.post.findMany({
            skip,
            take: limit,
            include: {
                author: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true,
                    },
                },
                likes: true,
                comments: {
                    take: 3, // Only load first 3 comments initially
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
                },
                imageAttachments: true,
                videoAttachments: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Get total count for pagination info
        const totalPosts = await prisma.post.count();
        const hasMore = skip + posts.length < totalPosts;

        res.status(200).json({
            posts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalPosts / limit),
                hasMore,
                totalPosts
            }
        });
    } catch (error) {
        console.error("Error fetching all posts:", error);
        next(error);
    }
});

// GET comments for a specific post with pagination
router.get("/:postId/comments", async (req, res, next) => {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    try {
        const comments = await prisma.comment.findMany({
            where: { postId: parseInt(postId) },
            skip,
            take: limit,
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

        const totalComments = await prisma.comment.count({
            where: { postId: parseInt(postId) }
        });

        res.status(200).json({
            comments,
            pagination: {
                currentPage: page,
                hasMore: skip + comments.length < totalComments,
                totalComments
            }
        });
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
        res.status(200).json({ liked: !!like });
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
        const existingLike = await prisma.like.findFirst({
            where: {
                postId: parseInt(postId),
                userId: userId,
            },
        });

        if (existingLike) {
            await prisma.like.delete({
                where: {
                    id: existingLike.id,
                },
            });
            const updatedLikes = await prisma.like.findMany({
                where: { postId: parseInt(postId) },
            });
            res.status(200).json({ message: "Post unliked", liked: false, likes: updatedLikes });
        } else {
            await prisma.like.create({
                data: {
                    postId: parseInt(postId),
                    userId: userId,
                },
            });
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
        const comment = await prisma.comment.findUnique({
            where: { id: parseInt(commentId) },
        });

        if (!comment) {
            return res.status(404).json({ error: "Comment not found." });
        }

        if (comment.userId !== userId) {
            return res.status(403).json({ error: "You are not authorized to delete this comment." });
        }

        await prisma.comment.delete({
            where: { id: parseInt(commentId) },
        });

        res.status(200).json({ message: "Comment deleted successfully." });
    } catch (error) {
        console.error("Error deleting comment:", error);
        next(error);
    }
});

// DELETE endpoint to delete a post
router.delete("/:postId", verifyToken, async (req, res, next) => {
    const { postId } = req.params;
    const userId = req.userId;

    try {
        const post = await prisma.post.findUnique({
            where: { id: parseInt(postId) },
            include: {
                imageAttachments: true,
                videoAttachments: true,
            },
        });

        if (!post) {
            return res.status(404).json({ error: "Post not found." });
        }

        if (post.authorId !== userId) {
            return res.status(403).json({ error: "You are not authorized to delete this post." });
        }

        // Delete associated media files (including optimized versions)
        const uploadDir = '/mnt/disks/uploads';
        const optimizedDir = '/mnt/disks/uploads/optimized';
        
        if (post.imageAttachments) {
            for (const attachment of post.imageAttachments) {
                const filesToDelete = [
                    path.join(uploadDir, attachment.url), // Original
                    path.join(optimizedDir, `optimized-${attachment.url}`), // Optimized
                    path.join(optimizedDir, `thumb-${attachment.url}`) // Thumbnail
                ];

                for (const filePath of filesToDelete) {
                    try {
                        await fs.unlink(filePath);
                        console.log(`Deleted file: ${filePath}`);
                    } catch (fileError) {
                        console.error(`Error deleting file ${filePath}:`, fileError);
                    }
                }
            }
        }

        if (post.videoAttachments) {
            for (const attachment of post.videoAttachments) {
                const filePath = path.join(uploadDir, attachment.url);
                try {
                    await fs.unlink(filePath);
                    console.log(`Deleted file: ${filePath}`);
                } catch (fileError) {
                    console.error(`Error deleting file ${filePath}:`, fileError);
                }
            }
        }

        await prisma.post.delete({
            where: { id: parseInt(postId) },
        });

        res.status(200).json({ message: "Post deleted successfully." });

    } catch (error) {
        console.error("Error deleting post:", error);
        next(error);
    }
});

module.exports = router;