const express = require("express");
const router = express.Router();

router.use(express.json());

const prisma = require("../prisma");
const fs = require('fs').promises;
const verifyToken = require("../verify");

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
                        // You might want to add more fields to search, like username
                    ],
                },
            });
        } else {
            users = await prisma.user.findMany();
        }
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        next(error); // Pass the error to the error handling middleware
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

router.delete("/me", verifyToken, async (req, res, next) => {
    try {
        const userId = req.userId; // This comes from the verifyToken middleware
        
        // Optional: Add password confirmation for extra security
        const { password } = req.body;
        
        if (password) {
            // Verify the user's password before deletion
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });
            
            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }
            
            const bcrypt = require('bcrypt');
            const passwordMatch = await bcrypt.compare(password, user.password);
            
            if (!passwordMatch) {
                return res.status(401).json({ message: "Invalid password." });
            }
        }
        
        // Delete the user - Prisma will handle cascading deletes based on your schema
        await prisma.user.delete({
            where: { id: userId }
        });
        
        // Remove user from WebSocket connections if they're connected
        // You'll need to access connectedClients from your server.js
        // For now, we'll just log this
        console.log(`User ${userId} account deleted successfully`);
        
        res.status(200).json({ 
            message: "Account deleted successfully." 
        });
        
    } catch (error) {
        console.error("Error deleting account:", error);
        
        // Handle specific Prisma errors
        if (error.code === 'P2025') {
            return res.status(404).json({ message: "User not found." });
        }
        
        next(error);
    }
});

module.exports = router;