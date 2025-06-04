const express = require("express");
const router = express.Router();
router.use(express.json());

const prisma = require("../prisma");
const fs = require('fs').promises;
const verifyToken = require("../verify");

router.post("/", verifyToken, async (req, res, next) => {
    try {
        const { shippingAddressId } = req.body;
        const userId = req.userId;

        // Get user's cart with items
        const cart = await prisma.cart.findUnique({
            where: { userId: userId },
            include: {
                cartItems: {
                    include: {
                        product: true
                    }
                }
            }
        });

        if (!cart || cart.cartItems.length === 0) {
            return res.status(400).json({ error: "Cart is empty" });
        }

        // Validate shipping address if provided
        let shippingAddress = null;
        if (shippingAddressId) {
            shippingAddress = await prisma.shippingAddress.findFirst({
                where: {
                    id: parseInt(shippingAddressId),
                    userId: userId
                }
            });

            if (!shippingAddress) {
                return res.status(404).json({ error: "Shipping address not found" });
            }
        }

        // Calculate total amount
        const totalAmount = cart.cartItems.reduce((sum, item) => {
            return sum + (item.quantity * item.product.price);
        }, 0);

        // Create the order
        const order = await prisma.order.create({
            data: {
                userId: userId,
                shippingAddressId: shippingAddressId ? parseInt(shippingAddressId) : null,
                totalAmount: parseFloat(totalAmount.toFixed(2)),
                paymentStatus: 'pending'
            }
        });

        // Create order items from cart items
        const orderItemPromises = cart.cartItems.map(cartItem => {
            return prisma.orderItem.create({
                data: {
                    orderId: order.id,
                    productId: cartItem.productId,
                    quantity: cartItem.quantity,
                    price: cartItem.product.price // Store price at time of order
                }
            });
        });

        await Promise.all(orderItemPromises);

        // Clear the cart after successful order creation
        await prisma.cartItem.deleteMany({
            where: { cartId: cart.id }
        });

        // Get the complete order with items and shipping address
        const completeOrder = await prisma.order.findUnique({
            where: { id: order.id },
            include: {
                orderItems: {
                    include: {
                        product: {
                            include: { images: true }
                        }
                    }
                },
                shippingAddress: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });

        res.status(201).json({
            message: "Order created successfully",
            order: completeOrder
        });

    } catch (error) {
        console.error("Error creating order:", error);
        next(error);
    }
});

module.exports = router;