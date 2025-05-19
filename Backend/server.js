require("dotenv").config();
const express = require("express");
const app = express();
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

app.post("/api/register", async (req, res, next) => {
    const { username, password, email, firstName, lastName, phoneNumber, yearGraduated } = req.body;

    // 1. Parse and Validate yearGraduated
    const parsedYear = parseInt(yearGraduated, 10);
    if (isNaN(parsedYear)) {
        return res.status(400).json({ message: "yearGraduated must be a valid number." });
    }

    try {
        // 2. Use the parsed value in Prisma
        const hashedPassword = await bcrypt.hash(password, 5);
        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                email,
                firstName,
                lastName,
                phoneNumber,
                yearGraduated: parsedYear, // Use parsedYear here!
            },
        });

        // Send admin approval email
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

        // Send email to the registered user about pending approval
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
        next(error); // Pass the error to the error-handling middleware
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
       res.status(200).json({ token: token, message: "Login successful" }); // Changed status code to 200 for successful login
    } catch (error) {
        next(error);
    }
});

// New endpoint for admin to approve a user
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
            // Send welcome email to the approved user
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

            return res.status(200).json({ message: `User ${userToApprove.username} has been approved.` }); // Changed to 200
        } else {
            return res.status(404).json({ message: `User with ID ${userId} not found.` });
        }
    } catch (error) {
        next(error);
    }
});

app.use("/api", require("./api"));

app.use((err, req, res, next) => {
    console.error(err);
    const status = err.status || 500; // Use || for a more robust fallback
    const message = err.message || 'Internal server error.';
    res.status(status).json({ message });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}.`);
});