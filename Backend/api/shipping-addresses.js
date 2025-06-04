const express = require("express");
const router = express.Router();
const prisma = require("../prisma");
const verifyToken = require("../verify");

router.use(express.json());

router.post("/", verifyToken, async (req, res, next) => {
    try {
        const { street, city, state, zipCode, country } = req.body;
        const userId = req.userId;

        const address = await prisma.shippingAddress.create({
            data: {
                userId,
                street,
                city,
                state,
                zipCode,
                country
            }
        });

        res.status(201).json(address);
    } catch (error) {
        console.error("Error creating shipping address:", error);
        next(error);
    }
});

module.exports = router;