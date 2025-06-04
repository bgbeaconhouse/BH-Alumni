const router = require("express").Router();

router.use("/profiles", require("./profiles"));
router.use("/posts", require("./posts"));
router.use("/conversations", require("./conversations"));
router.use("/products", require("./products"));
module.exports = router;