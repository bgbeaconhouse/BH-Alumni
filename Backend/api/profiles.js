const express = require("express");
const router = express.Router();
const bcrypt = require('bcrypt');

// IMPORTANT: Make sure this middleware is applied
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

const prisma = require("../prisma");
const fs = require('fs').promises;
const verifyToken = require("../verify");

// Debug middleware
router.use((req, res, next) => {
    console.log(`Profiles router - ${req.method} ${req.path}`);
    console.log('Request body available:', !!req.body);
    next();
});

// Your existing GET routes
router.get("/", verifyToken, async (req, res, next) => {
    try {
        const searchTerm = req.query.search;
        let users;

        if (searchTerm) {
            users = await prisma.user.findMany({
                where: {
                    OR: [
                        { firstName: { contains: searchTerm, mode: 'insensitive' } },
                        { lastName: { contains: searchTerm, mode: 'insensitive' } },
                    ],
                },
            });
        } else {
            users = await prisma.user.findMany();
        }
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        next(error);
    }
});

router.get("/:id", verifyToken, async (req, res, next) => {
    try {
        const id = +req.params.id;
        const user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
            return next({
                status: 404,
                message: `Could not find user with id ${id}.`,
            });
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
});

// DELETE ACCOUNT ROUTE - This should work with your frontend
router.delete("/me", verifyToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        
        console.log('DELETE /me route hit!');
        console.log('User ID from token:', userId);
        console.log('Request body:', req.body);
        
        // Safely handle req.body that might be undefined
        let password = null;
        if (req.body && typeof req.body === 'object') {
            password = req.body.password;
        }
        
        // Optional password verification (if provided)
        if (password) {
            console.log('Password provided, verifying...');
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });
            
            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }
            
            const passwordMatch = await bcrypt.compare(password, user.password);
            
            if (!passwordMatch) {
                return res.status(401).json({ message: "Invalid password." });
            }
        }
        
        console.log('About to delete user:', userId);
        
        // Delete the user - Prisma will handle cascading deletes
        const deletedUser = await prisma.user.delete({
            where: { id: userId }
        });
        
        console.log(`User ${userId} account deleted successfully`);
        
        res.status(200).json({ 
            message: "Account deleted successfully." 
        });
        
    } catch (error) {
        console.error("Error deleting account:", error);
        
        // Handle specific Prisma errors
        if (error.code === 'P2025') {
            return res.status(404).json({ message: "User not found in database." });
        }
        
        // Return a proper error response
        res.status(500).json({ 
            message: "Failed to delete account. Please try again.",
            error: error.message 
        });
    }
});

router.delete("/:id", verifyToken, async (req, res, next) => {
    try {
        const userIdToDelete = parseInt(req.params.id);
        const requestingUserId = req.userId;
        
        console.log('DELETE /:id route hit!');
        console.log('Requesting user ID:', requestingUserId);
        console.log('User ID to delete:', userIdToDelete);
        
        // Verify the requesting user is an admin
        const requestingUser = await prisma.user.findUnique({
            where: { id: requestingUserId }
        });
        
        if (!requestingUser) {
            return res.status(404).json({ message: "Requesting user not found." });
        }
        
        if (!requestingUser.isAdmin) {
            return res.status(403).json({ 
                message: "Unauthorized. Only admins can delete user accounts." 
            });
        }
        
        // Prevent admin from deleting their own account via this route
        if (requestingUserId === userIdToDelete) {
            return res.status(400).json({ 
                message: "Use the /me endpoint to delete your own account." 
            });
        }
        
        // Check if the user to delete exists
        const userToDelete = await prisma.user.findUnique({
            where: { id: userIdToDelete }
        });
        
        if (!userToDelete) {
            return res.status(404).json({ 
                message: `User with ID ${userIdToDelete} not found.` 
            });
        }
        
        // Delete the user - Prisma will handle cascading deletes
        const deletedUser = await prisma.user.delete({
            where: { id: userIdToDelete }
        });
        
        console.log(`Admin ${requestingUserId} deleted user ${userIdToDelete} successfully`);
        
        res.status(200).json({
            message: `User ${deletedUser.username} (ID: ${userIdToDelete}) has been deleted successfully.`
        });
        
    } catch (error) {
        console.error("Error deleting user account:", error);
        
        // Handle specific Prisma errors
        if (error.code === 'P2025') {
            return res.status(404).json({ 
                message: "User not found in database." 
            });
        }
        
        // Return a proper error response
        res.status(500).json({
            message: "Failed to delete user account. Please try again.",
            error: error.message
        });
    }
});

module.exports = router;