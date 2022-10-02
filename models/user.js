const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: true },
  password: { type: String, required: true, minlength: 6 },
  history: [
    {
      dateGenerated: { type: Date, default: Date.now },
      datePaid: { type: Date, default: null },
      Reading: { type: Number, required: true },
      Amount: { type: Number, required: true },
      Status: { type: String, required: true },
      Note: String,
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
