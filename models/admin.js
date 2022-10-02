const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const adminSchema = new Schema({
  pricePerUnit: { type: Number, required: true },
});

module.exports = mongoose.model("Admin", adminSchema);
