const express = require("express")
const router=express.Router()

router.use(express.json())


const prisma = require("../prisma");
const fs = require('fs').promises;
const verifyToken = require("../verify")






router.get("/", verifyToken, async (req, res, next) => {
    try {
        const users = await prisma.user.findMany()
        res.json(users)
    } catch (error) {
        next()
    }
})

router.get("/:id", verifyToken, async (req, res, next) => {
    try {
        const id = +req.params.id;

        const user = await prisma.user.findUnique({where: {id}})

        if (!user) {
            return next({
              status: 404,
              message: `Could not find user with id ${id}.`,
            });
          }


        res.json(user)
    } catch (error) {
        next()
    }
})



module.exports = router;