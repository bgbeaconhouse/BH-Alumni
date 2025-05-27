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

module.exports = router;