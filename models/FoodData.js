const mongoose = require("mongoose");

const { Schema } = mongoose;

const FoodSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  img: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Food", FoodSchema);
