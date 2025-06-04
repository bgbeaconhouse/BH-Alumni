const express = require("express");
const router = express.Router();
const multer = require("multer");
router.use(express.json());

const prisma = require("../prisma");
const fs = require('fs').promises;
const verifyToken = require("../verify");

// Configure multer
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = 'uploads/products/';
        await fs.mkdir(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${req.params.id}_${Date.now()}_${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        cb(null, allowedTypes.includes(file.mimetype));
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});


router.post("/", verifyToken, async (req, res, next) => {
    try {
        const {name, description, price} = req.body
        const userId = req.userId
        const newProduct = await prisma.product.create({
            data: {name, description, price}
        })

        res.status(201).json(newProduct)
    } catch (error) {
        console.error("Error creating product", error)
        next(error)
    }
})

// NEW: Image upload endpoint
router.post("/:id/images", verifyToken, upload.array('images', 10), async (req, res, next) => {
    try {

                // ADD THESE DEBUG LINES HERE:
        console.log("Files received:", req.files);
        console.log("Body received:", req.body);
        console.log("Params received:", req.params);
        const productId = parseInt(req.params.id);

        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No images uploaded" });
        }

        const imagePromises = req.files.map(file => {
            return prisma.productImage.create({
                data: {
                    productId: productId,
                    url: `/uploads/products/${file.filename}`
                }
            });
        });

        const createdImages = await Promise.all(imagePromises);

        res.status(201).json({
            message: `Uploaded ${createdImages.length} image(s)`,
            images: createdImages
        });

    } catch (error) {
        console.error("Error uploading images:", error);
        next(error);
    }
});

// GET /api/products/:id - Get single product with images
router.get("/:id", async (req, res, next) => {
    try {
        const productId = parseInt(req.params.id);
        
        if (isNaN(productId)) {
            return res.status(400).json({ error: "Invalid product ID" });
        }
        
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                images: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        
        res.json(product);
    } catch (error) {
        console.error("Error fetching product:", error);
        next(error);
    }
});

// GET /api/products - Get all products with images
router.get("/", async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const [products, totalCount] = await Promise.all([
            prisma.product.findMany({
                include: {
                    images: {
                        orderBy: { createdAt: 'asc' },
                        take: 1 // Just get the first image for listing
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.product.count()
        ]);
        
        const totalPages = Math.ceil(totalCount / limit);
        
        res.json({
            products,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        next(error);
    }
});
module.exports = router;