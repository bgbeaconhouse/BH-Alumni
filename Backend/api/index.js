const router = require("express").Router();

router.use("/profiles", require("./profiles"));
router.use("/posts", require("./posts"));
module.exports = router;