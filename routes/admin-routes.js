const express = require("express");
const checkAuth = require("../middleware/check-auth");

const adminController = require("../controllers/admin-controllers");

const router = express.Router();

router.get("/", adminController.getPrice);

router.use(checkAuth); //checke for valid token to continue below

router.patch("/update", adminController.updatePrice);

module.exports = router;
