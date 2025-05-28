// server.js
require("dotenv").config();
const express = require("express");
const app = express();
const http = require('http');
const { WebSocketServer } = require('ws');
const prisma = require("./prisma");
const PORT = 3000;

app.use(express.json());
app.use(require("morgan")("dev"));
app.use('/uploads', express.static('uploads'));
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const verifyToken = require("./verify");
const nodemailer = require('nodemailer');

// Configure Nodemailer with your email service details
const transporter = nodemailer.createTransport({
    service: 'Gmail', // e.g., 'Gmail', 'Outlook'
    auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASSWORD, // Your email password or app-specific password
    },
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL; // Ensure you have this in your .env file

// Create an HTTP server instance from your Express app
const server = http.createServer(app);

// Create a WebSocket server instance attached to the HTTP server
const wss = new WebSocketServer({ server });

// Map to store connected WebSocket clients: userId -> WebSocket instance
const connectedClients = new Map();

// WebSocket server connection handling
wss.on('connection', (ws, req) => {
    console.log('New WebSocket client connected');

    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const token = urlParams.get('token');
    let userId = null;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.id;

            connectedClients.set(userId, ws);
            console.log(`User ${userId} authenticated and connected via WebSocket.`);

            ws.on('message', async (message) => {
                try {
                    const parsedMessage = JSON.parse(message.toString());
                    const { conversationId, content } = parsedMessage;

                    if (!userId) {
                        console.warn('Received message from unauthenticated WebSocket client.');
                        return;
                    }
                    if (!conversationId || (!content && !parsedMessage.media)) {
                        console.warn('Invalid message format received:', parsedMessage);
                        return;
                    }

                    // Save the message to the database
                    const newMessage = await prisma.message.create({
                        data: {
                            senderId: userId,
                            content: content,
                            conversationId: parseInt(conversationId),
                        },
                        include: {
                            sender: {
                                select: { id: true, username: true, firstName: true, lastName: true, profilePictureUrl: true },
                            },
                            imageAttachments: true,
                            videoAttachments: true,
                        },
                    });

                    console.log(`Message saved via WebSocket: ${newMessage.id} in conversation ${conversationId}`);

                    // Broadcast the new message to all other clients in the same conversation
                    const conversationMembers = await prisma.conversationMember.findMany({
                        where: { conversationId: parseInt(conversationId) },
                        select: { userId: true },
                    });

                    const memberUserIds = new Set(conversationMembers.map(member => member.userId));

                    for (const [clientId, clientWs] of connectedClients) {
                        if (memberUserIds.has(clientId)) {
                            if (clientWs.readyState === ws.OPEN) {
                                clientWs.send(JSON.stringify({ type: 'newMessage', message: newMessage }));
                            }
                        }
                    }

                } catch (error) {
                    console.error('Error processing WebSocket message:', error);
                }
            });

            ws.on('close', () => {
                connectedClients.delete(userId);
                console.log(`User ${userId} disconnected from WebSocket.`);
            });

            ws.on('error', (error) => {
                console.error(`WebSocket error for user ${userId}:`, error);
            });

        } catch (err) {
            console.error('WebSocket authentication failed:', err);
            ws.close();
        }
    } else {
        console.log('WebSocket connection attempted without authentication token. Closing connection.');
        ws.close();
    }
});


// Your existing API endpoints (registration, login, admin approval)
app.post("/api/register", async (req, res, next) => {
    const { username, password, email, firstName, lastName, phoneNumber, yearGraduated } = req.body;

    const parsedYear = parseInt(yearGraduated, 10);
    if (isNaN(parsedYear)) {
        return res.status(400).json({ message: "yearGraduated must be a valid number." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 5);
        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                email,
                firstName,
                lastName,
                phoneNumber,
                yearGraduated: parsedYear,
            },
        });

        if (ADMIN_EMAIL) {
            const adminMailOptions = {
                from: process.env.EMAIL_USER,
                to: ADMIN_EMAIL,
                subject: 'New User Registration for Approval',
                html: `<p>A new user has registered:</p>
                        <ul>
                            <li>Username: ${username}</li>
                            <li>Email: ${email}</li>
                            <li>Name: ${firstName} ${lastName}</li>
                            <li>Graduation Year: ${parsedYear}</li>
                            <li>Phone Number: ${phoneNumber}</li>
                        </ul>
                        <p>Please log in to the admin panel to approve this user.</p>`,
            };

            transporter.sendMail(adminMailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending admin approval email:', error);
                } else {
                    console.log('Admin approval email sent:', info.response);
                }
            });
        } else {
            console.warn('ADMIN_EMAIL not set. Cannot send admin approval email.');
        }

        const userMailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Registration Pending Approval',
            html: `<p>Hello ${firstName} ${lastName},</p>
                    <p>Thank you for registering with Beacon House Alumni Connect!</p>
                    <p>Your account is currently pending approval from an administrator. You will receive another email once your account has been reviewed and approved.</p>
                    <p>Thank you for your patience.</p>`,
        };

        transporter.sendMail(userMailOptions, (error, info) => {
            if (error) {
                console.error('Error sending user pending approval email:', error);
                return res.status(201).json({ message: 'Registration successful, but email about pending approval could not be sent.' });
            } else {
                console.log('User pending approval email sent:', info.response);
                return res.status(201).json({ message: 'Registration successful! Your account is pending admin approval. Please check your email for confirmation.' });
            }
        });
    } catch (error) {
        next(error);
    }
});

app.post("/api/login", async (req, res, next) => {
    const { username, password } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { username },
        });
        if (!user) {
            return res.status(400).json("User not found.");
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json("Account not found");
        }
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
        res.status(200).json({ token: token, message: "Login successful" });
    } catch (error) {
        next(error);
    }
});

app.post("/api/admin/approve/:userId", verifyToken, async (req, res, next) => {
    const { userId } = req.params;

    try {
        const requestingUser = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!requestingUser?.isAdmin) {
            return res.status(403).json({ message: 'Unauthorized. Only admins can approve users.' });
        }

        const userToApprove = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { approved: true },
        });

        if (userToApprove) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: userToApprove.email,
                subject: 'Your Account Has Been Approved!',
                html: `<p>Hello ${userToApprove.firstName} ${userToApprove.lastName},</p><p>Your Beacon House Alumni Connect account has been approved! You can now log in.</p>`,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending welcome email:', error);
                } else {
                    console.log('Welcome email sent:', info.response);
                }
            });

            return res.status(200).json({ message: `User ${userToApprove.username} has been approved.` });
        } else {
            return res.status(404).json({ message: `User with ID ${userId} not found.` });
        }
    } catch (error) {
        next(error);
    }
});

// Pass wss and connectedClients to the conversations router
app.use("/api/conversations", require("./api/conversations")(wss, connectedClients));

// Your other existing API routes from './api'
// Make sure to adjust other routes if they also need access to wss/connectedClients
app.use("/api", require("./api"));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err);
    const status = err.status || 500;
    const message = err.message || 'Internal server error.';
    res.status(status).json({ message });
});

// Start the HTTP server (which also hosts the WebSocket server)
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}.`);
    console.log(`WebSocket server also running on ws://localhost:${PORT}`);
});