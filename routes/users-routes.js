const express = require("express");
const checkAuth = require("../middleware/check-auth");

const usersController = require("../controllers/users-controllers");

const router = express.Router();

router.get("/", usersController.getUsers);

router.get("/:uid", usersController.getUserbyId);

router.post("/login", usersController.login);

router.post("/signup", usersController.signup);

router.use(checkAuth); //checke for valid token to continue below

router.patch("/new/:uid", usersController.addNewBill);

router.patch("/update/:bid", usersController.updateBillStatus);

router.patch("/deleteBill", usersController.deleteBill);

module.exports = router;
