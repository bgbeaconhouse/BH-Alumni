const express = require("express");
const router = express.Router();
router.use(express.json());

const prisma = require("../prisma");
const fs = require('fs').promises;
const verifyToken = require("../verify");

// POST /api/cart - Add item to cart
router.post("/", verifyToken, async (req, res, next) => {
    try {
        const { productId, quantity = 1 } = req.body;
        const userId = req.userId;

        // Validate input
        if (!productId) {
            return res.status(400).json({ error: "Product ID is required" });
        }

        if (quantity <= 0) {
            return res.status(400).json({ error: "Quantity must be greater than 0" });
        }

        // Check if product exists
        const product = await prisma.product.findUnique({
            where: { id: parseInt(productId) }
        });

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        // Get or create user's cart
        let cart = await prisma.cart.findUnique({
            where: { userId: userId }
        });

        if (!cart) {
            cart = await prisma.cart.create({
                data: { userId: userId }
            });
        }

        // Check if item already exists in cart
        const existingCartItem = await prisma.cartItem.findUnique({
            where: {
                cartId_productId: {
                    cartId: cart.id,
                    productId: parseInt(productId)
                }
            }
        });

        let cartItem;

        if (existingCartItem) {
            // Update quantity if item already exists
            cartItem = await prisma.cartItem.update({
                where: { id: existingCartItem.id },
                data: { quantity: existingCartItem.quantity + parseInt(quantity) },
                include: {
                    product: {
                        include: { images: true }
                    }
                }
            });
        } else {
            // Create new cart item
            cartItem = await prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId: parseInt(productId),
                    quantity: parseInt(quantity)
                },
                include: {
                    product: {
                        include: { images: true }
                    }
                }
            });
        }

        res.status(201).json({
            message: "Item added to cart successfully",
            cartItem: cartItem
        });

    } catch (error) {
        console.error("Error adding to cart", error);
        next(error);
    }
});

// GET /api/cart - View all cart items
router.get("/", verifyToken, async (req, res, next) => {
    try {
        const userId = req.userId;

        // Get user's cart with all items
        const cart = await prisma.cart.findUnique({
            where: { userId: userId },
            include: {
                cartItems: {
                    include: {
                        product: {
                            include: { images: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!cart) {
            return res.json({
                cart: null,
                items: [],
                totalItems: 0,
                totalAmount: 0
            });
        }

        // Calculate totals
        const totalItems = cart.cartItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = cart.cartItems.reduce((sum, item) => sum + (item.quantity * item.product.price), 0);

        res.json({
            cart: {
                id: cart.id,
                userId: cart.userId,
                createdAt: cart.createdAt,
                updatedAt: cart.updatedAt
            },
            items: cart.cartItems,
            totalItems,
            totalAmount: parseFloat(totalAmount.toFixed(2))
        });

    } catch (error) {
        console.error("Error fetching cart", error);
        next(error);
    }
});

module.exports = router;