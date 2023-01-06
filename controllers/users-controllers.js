const HttpError = require("../models/http-error");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Admin = require("../models/admin");

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find(
      { _id: { $not: { $eq: process.env.ADMIN_ID } } },
      "-password"
    );
  } catch {
    const error = new HttpError("fetching users failed", 500);
    return next(error);
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const getUserbyId = async (req, res, next) => {
  const userId = req.params.uid;
  let user;
  try {
    user = await User.findById(userId, "-password");
  } catch (err) {
    const error = new HttpError(
      "Couldn't find the user by uid because something went wrong with the request",
      500
    );
    return next(error);
  }
  if (!user) {
    const error = new HttpError("error finding user by uid in db", 404);
    return next(error);
  }
  res.json({ user: user.toObject({ getters: true }) });
};

const login = async (req, res, next) => {
  const { name, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ name: name });
  } catch {
    const error = new HttpError("log in failed", 500);
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError("Invalid Credentials, User not found", 403);
    return next(error);
  }

  if (password != existingUser.password) {
    const error = new HttpError("Invalid Credentials, Wrong Password", 403);
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, name: existingUser.name },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("login up failed while creating token", 500);
    return next(error);
  }
  res.status(200).json({
    userId: existingUser.id,
    // name: existingUser.name,
    token: token,
  });
};

const signup = async (req, res, next) => {
  const { name, password } = req.body;
  console.log(req.body);
  let existingUser;
  try {
    existingUser = await User.findOne({ name: name });
  } catch {
    const error = new HttpError("sign up failed", 500);
    return next(error);
  }
  if (existingUser) {
    const error = new HttpError("user exists already,please login", 422);
    return next(error);
  }

  const createdUser = new User({
    name, // name: name
    password,
    history: [
      {
        Reading: 0000,
        Amount: 0,
        Status: "Paid",
        datePaid: new Date(),
        Note: "initial bill",
      },
    ],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Sign up failed in saving", 500);
    return next(error);
  }

  res.status(201).json({
    userId: createdUser.id,
    name: createdUser.name,
  });
};

const updateUser = async (req, res, next) => {
  const user_id = req.params.uid;
  const { name, password } = req.body;
  console.log(name + " " + password);

  if (req.userData.userId.toString() !== process.env.ADMIN_ID) {
    const error = new HttpError("You are not authorized to generate bill", 401);
    return next(error);
  }

  User.findByIdAndUpdate(
    user_id,
    { name: name, password: password },
    function (err, foundUser) {
      console.log(foundUser);
      if (!foundUser) {
        res
          .status(404)
          .json({ message: "user updation failed while finding user" });
      } else if (err) {
        res
          .status(404)
          .json({ message: "Something went wrong while updating the user" });
      } else {
        res.status(200).json({
          message: "user updated",
        });
      }
    }
  );
};

const addNewBill = async (req, res, next) => {
  const userId = req.params.uid;
  const { currentReading } = req.body;
  console.log(userId + " " + req.userData.userId + " " + process.env.ADMIN_ID);
  if (
    req.userData.userId.toString() !== process.env.ADMIN_ID &&
    req.userData.userId.toString() !== userId
  ) {
    const error = new HttpError("You are not authorized to generate bill", 401);
    return next(error);
  }

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError("updation failed while finding user", 404);
    return next(error);
  }

  if (!user) {
    const error = new HttpError("User updating ques doesnt exist", 500);
    return next(error);
  }

  let admin;
  try {
    admin = await Admin.findOne();
  } catch {
    const error = new HttpError("fetching admin failed", 500);
    return next(error);
  }
  if (
    user.history[user.history.length - 1].Status === "Due" ||
    user.history[user.history.length - 1].Status === "Processing"
  ) {
    const error = new HttpError(
      "Can't generate new bill until previous bill is cleared",
      500
    );
    return next(error);
  }

  if (currentReading <= user.history[user.history.length - 1].Reading) {
    const error = new HttpError("Invalid reading input", 500);
    return next(error);
  }

  const a =
    (currentReading - user.history[user.history.length - 1].Reading) *
    admin.pricePerUnit;
  const newBill = {
    dateGenerated: new Date(),
    Reading: currentReading,
    Amount: a,
    Status: "Due",
  };

  user.history = [...user.history, newBill];
  console.log(newBill);
  try {
    await user.save();
  } catch (err) {
    const error = new HttpError("something went wrong, can't add bill", 500);
    return next(error);
  }

  res.status(200).json({
    message: "success adding bill",
    newBill: user.history[user.history.length - 1].toObject({ getters: true }),
  });
};

const updateBillStatus = async (req, res, next) => {
  const bill_id = req.params.bid;
  const { status, note, datePaid, userId, billUserId } = req.body;

  if (status === "Processing") {
    if (
      req.userData.userId.toString() !== process.env.ADMIN_ID &&
      req.userData.userId.toString() !== userId
    ) {
      const error = new HttpError("You are not authorized to update bill", 401);
      return next(error);
    }
  }
  if (status === "Due" || status === "Paid") {
    if (req.userData.userId.toString() !== process.env.ADMIN_ID) {
      const error = new HttpError("You are not authorized to update bill", 401);
      return next(error);
    }
  }

  User.updateOne(
    { "history._id": bill_id },
    {
      $set: {
        "history.$.Status": status,
        "history.$.Note": note,
        "history.$.datePaid": datePaid,
      },
    },
    async function (err, response) {
      if (!response) {
        res.status(404).json({ message: "bill status updation failed" });
      } else if (err) {
        res.status(404).json({
          message: "Something went wrong while updatind status of the bill",
        });
      } else {
        let user;
        try {
          user = await User.findById(billUserId, "-password");
        } catch (err) {
          const error = new HttpError(
            "updation failed while finding user",
            404
          );
          return next(error);
        }

        if (!user) {
          const error = new HttpError("User updating bill doesnt exist", 500);
          return next(error);
        }

        res.status(200).json({
          message: "Bill Status UPDATED",
          user: user.toObject({ getters: true }),
        });
      }
    }
  );
};

const deleteBill = async (req, res, next) => {
  const { user_id, bill_id } = req.query;

  if (req.userData.userId.toString() !== process.env.ADMIN_ID) {
    const error = new HttpError("You are not authorized to generate bill", 401);
    return next(error);
  }

  User.findOneAndUpdate(
    { _id: user_id },
    { $pull: { history: { _id: bill_id } } }, //can add {new:true} to get updated user
    async function (err, foundUser) {
      console.log(foundUser);
      if (!foundUser) {
        res
          .status(404)
          .json({ message: "bill deletion failed while finding user" });
      } else if (err) {
        res
          .status(404)
          .json({ message: "Something went wrong while deleting the bill" });
      } else {
        let user;
        try {
          user = await User.findById(user_id, "-password");
        } catch (err) {
          const error = new HttpError(
            "deletion failed while finding user",
            404
          );
          return next(error);
        }

        if (!user) {
          const error = new HttpError("User of bill doesnt exist", 500);
          return next(error);
        }
        res.status(200).json({
          message: "Bill deleted",
          user: user.toObject({ getters: true }),
        });
      }
    }
  );
};

exports.getUsers = getUsers;
exports.getUserbyId = getUserbyId;
exports.signup = signup;
exports.login = login;
exports.updateUser = updateUser;
exports.addNewBill = addNewBill;
exports.updateBillStatus = updateBillStatus;
exports.deleteBill = deleteBill;
