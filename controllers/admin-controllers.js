const HttpError = require("../models/http-error");
const Admin = require("../models/admin");

const getPrice = async (req, res, next) => {
  let admin;
  try {
    admin = await Admin.findOne();
  } catch {
    const error = new HttpError("fetching price failed", 500);
    return next(error);
  }

  res.json({ pricePerUnit: admin.pricePerUnit });
};

const updatePrice = async (req, res, next) => {
  const { price } = req.body;
  if (req.userData.userId.toString() === process.env.ADMIN_ID) {
    Admin.updateOne(
      {},
      {
        $set: {
          pricePerUnit: price,
        },
      },
      function (err, admin) {
        if (!admin) {
          res.status(404).json({ message: "Price updation failed" });
        } else if (err) {
          res.status(404).json({
            message: "Something went wrong while updating price",
          });
        } else {
          res.status(200).json({
            message: "Price updated",
          });
        }
      }
    );
  } else {
    const error = new HttpError("You are not authorized to update price", 401);
    return next(error);
  }
};
exports.getPrice = getPrice;
exports.updatePrice = updatePrice;
