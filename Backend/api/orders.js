const express = require("express");
const router = express.Router();
router.use(express.json());

const prisma = require("../prisma");
const fs = require('fs').promises;
const verifyToken = require("../verify");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// POST /api/orders/create-payment-intent - Create payment intent
router.post("/create-payment-intent", verifyToken, async (req, res, next) => {
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

        // Calculate total amount in cents (Stripe requires cents)
        const totalAmount = cart.cartItems.reduce((sum, item) => {
            return sum + (item.quantity * item.product.price);
        }, 0);

        const amountInCents = Math.round(totalAmount * 100);

        // Get user details for the payment intent
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, firstName: true, lastName: true }
        });

        // Create payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                userId: userId.toString(),
                shippingAddressId: shippingAddressId ? shippingAddressId.toString() : '',
                cartId: cart.id.toString()
            },
            receipt_email: user.email,
            description: `Order for ${user.firstName} ${user.lastName}`,
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            totalAmount: totalAmount,
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        console.error("Error creating payment intent:", error);
        next(error);
    }
});

// POST /api/orders/confirm-payment - Confirm payment and create order
router.post("/confirm-payment", verifyToken, async (req, res, next) => {
    try {
        const { paymentIntentId, shippingAddressId } = req.body;
        const userId = req.userId;

        // Verify payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ error: "Payment not completed" });
        }

        // Verify the payment belongs to this user
        if (paymentIntent.metadata.userId !== userId.toString()) {
            return res.status(403).json({ error: "Unauthorized payment" });
        }

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
                paymentStatus: 'paid',
                stripeChargeId: paymentIntent.id
            }
        });

        // Create order items from cart items
        const orderItemPromises = cart.cartItems.map(cartItem => {
            return prisma.orderItem.create({
                data: {
                    orderId: order.id,
                    productId: cartItem.productId,
                    quantity: cartItem.quantity,
                    price: cartItem.product.price
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
        console.error("Error confirming payment:", error);
        next(error);
    }
});

// GET /api/orders/:id - Get single order
router.get("/:id", verifyToken, async (req, res, next) => {
    try {
        const orderId = parseInt(req.params.id);
        const userId = req.userId;

        const order = await prisma.order.findFirst({
            where: { 
                id: orderId,
                userId: userId
            },
            include: {
                orderItems: {
                    include: {
                        product: {
                            include: { images: true }
                        }
                    }
                },
                shippingAddress: true
            }
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        res.json(order);

    } catch (error) {
        console.error("Error fetching order:", error);
        next(error);
    }
});

// GET /api/orders - Get user's orders
router.get("/", verifyToken, async (req, res, next) => {
    try {
        const userId = req.userId;

        const orders = await prisma.order.findMany({
            where: { userId: userId },
            include: {
                orderItems: {
                    include: {
                        product: {
                            include: { images: true }
                        }
                    }
                },
                shippingAddress: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ orders });

    } catch (error) {
        console.error("Error fetching orders:", error);
        next(error);
    }
});

module.exports = router;