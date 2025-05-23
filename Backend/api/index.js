const router = require("express").Router();

router.use("/profiles", require("./profiles"));
router.use("/posts", require("./posts"));
router.use("/conversations", require("./conversations"));
module.exports = router;