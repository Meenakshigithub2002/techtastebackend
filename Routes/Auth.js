const express = require("express");
const User = require("../models/User");
const Order = require("../models/Orders");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const axios = require("axios");
const fetch = require("../middleware/fetchdetails");
const FoodData = require("../models/FoodData");
const { Router } = require("express");
const instamojo = require('instamojo-payment-nodejs');
const Razorpay = require('razorpay');
const jwtSecret = "HaHa";

const razorpay = new Razorpay({
  key_id: 'rzp_test_N7iKIbYFI3runu',
  key_secret: 'NZoTVO1PZiWipyKVw21eEOb7',
});
const API_KEY = 'test_8f87673cce048747126bcf30502';
const AUTH_TOKEN = 'test_aea7b98538f5f92d236b4de76ba';
instamojo.setKeys(API_KEY, AUTH_TOKEN);

// const instamojo = new instamojo(API_KEY, AUTH_TOKEN, true);
instamojo.isSandboxMode(true); // For testing

// Endpoint to initiate a payment
router.post('/create-payment', async (req, res) => {
  // this api is for payment start
  try {
    const response = await instamojo.createNewPaymentRequest({
      purpose: 'Test Payment',
      amount: '100000',
      buyer_name: 'Meen sharma',
      redirect_url: 'http://localhost:3000/success',
      phone: '8320506799',
    });
    // console.log(response);
    res.status(200).send({ red_url: response.payment_request.longurl })
  } catch (error) {
    console.error('Error creating payment:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/razorpay-order-create", async (req, res) => {
  const options = {
    amount: req.body.amount, // amount in paise (100 paise = 1 INR)
    currency: 'INR',
  };
  console.log(req.body.amount);
  try {
    const order = await razorpay.orders.create(options);
    res.json({ order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
})
// var foodItems= require('../index').foodData;
// require("../index")
//Creating a user and storing data to MongoDB Atlas, No Login Requiered
router.post(
  "/createuser",
  [
    body("email").isEmail(),
    body("password").isLength({ min: 5 }),
    body("name").isLength({ min: 3 }),
  ],
  async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success, errors: errors.array() });
    }

    const salt = await bcrypt.genSalt(10);
    let securePass = await bcrypt.hash(req.body.password, salt);
    try {
      await User.create({
        name: req.body.name,
        password: securePass,
        email: req.body.email,
        location: req.body.location,
      })
        .then((user) => {
          const data = {
            user: {
              id: user.id,
            },
          };
          const authToken = jwt.sign(data, jwtSecret);
          success = true;
          res.json({ success, authToken });
        })
        .catch((err) => {
          console.log(err);
          res.json({ error: "Please enter a unique value." });
        });
    } catch (error) {
      console.error(error.message);
    }
  }
);

// Authentication a User, No login Requiered
router.post(
  "/login",
  [
    body("email", "Enter a Valid Email").isEmail(),
    body("password", "Password cannot be blank").exists(),
  ],
  async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
      let user = await User.findOne({ email }); //{email:email} === {email}
      if (!user) {
        return res
          .status(400)
          .json({ success, error: "Try Logging in with correct credentials" });
      }

      const pwdCompare = await bcrypt.compare(password, user.password); // this return true false.
      if (!pwdCompare) {
        return res
          .status(400)
          .json({ success, error: "Try Logging in with correct credentials" });
      }
      const data = {
        user: {
          id: user.id,
        },
      };

      success = true;
      const authToken = jwt.sign(data, jwtSecret);
      res.json({ success, authToken, user });
    } catch (error) {
      console.error(error.message);
      res.send("Server Error");
    }
  }
);

// Get logged in User details, Login Required.
router.post("/getuser", fetch, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password"); // -password will not pick password from db.
    res.send(user);
  } catch (error) {
    console.error(error.message);
    res.send("Server Error");
  }
});
// Get logged in User details, Login Required.
router.post("/getlocation", async (req, res) => {
  try {
    let lat = req.body.latlong.lat;
    let long = req.body.latlong.long;

    let location = await axios
      .get(
        "https://api.opencagedata.com/geocode/v1/json?q=" +
        lat +
        "+" +
        long +
        "&key=74c89b3be64946ac96d777d08b878d43"
      )
      .then(async (res) => {

        let response = res.data.results[0].components;

        let { village, county, state_district, state, postcode } = response;
        return String(
          village +
          "," +
          county +
          "," +
          state_district +
          "," +
          state +
          "\n" +
          postcode
        );
      })
      .catch((error) => {
        console.error(error);
      });
    res.send({ location });
  } catch (error) {
    console.error(error.message);
    res.send("Server Error");
  }
});

router.post("/fooddataadd", async (req, res) => {
  try {
    const { name, img, options, url } = req.body;
    // const foodData =
    const foodData = new FoodData({
      name,
      img,
      options,
      url,
    });
    await foodData.save();
    res.status(200).send("Product added successfully")

  } catch (error) {
    console.log(error);
  }

});
router.post("/orderData", async (req, res) => {
  let data = req.body.order_data;

  await data.splice(0, 0, { Order_date: req.body.order_date });

  //if email not exisitng in db then create: else: InsertMany()
  let eId = await Order.findOne({ email: req.body.email });

  let val
  const lastOrder = await Order.findOne({}).sort({ updatedAt: -1 })
  const lastOrderOrderNo = lastOrder?.order_data[lastOrder.order_data.length - 1][1]?.orderNo
  if (lastOrderOrderNo) {
    val = lastOrderOrderNo + 1
  } else {
    val = 101
  }
  if (eId === null) {
    try {

      if (data[2] === undefined) {
        data[1].status = "ordered"
        data[1].orderNo = val
        data[1].email = req.body.email
      } else {
        data[1].status = "ordered"
        data[1].orderNo = val
        data[1].email = req.body.email
        data[2].status = "ordered"
        data[2].orderNo = val
        data[2].email = req.body.email
      }
      await Order.create({
        email: req.body.email,
        order_data: [data],
      }).then(() => {
        res.status(200).json({ success: true });
      });
    } catch (error) {
      res.status(500).send("Server Error", error.message);
    }
  } else {
    try {

      if (data[2] === undefined) {
        data[1].status = "ordered"
        data[1].orderNo = val
        data[1].email = req.body.email

      } else {
        data[1].status = "ordered"
        data[1].orderNo = val
        data[1].email = req.body.email
        data[2].status = "ordered"
        data[2].orderNo = val
        data[2].email = req.body.email
      }
      await Order.findOneAndUpdate(
        { email: req.body.email },
        { $push: { order_data: data } }
      ).then(() => {
        res.json({ success: true });
      });
    } catch (error) {

      res.send("Server Error", error.message);
    }
  }
});

router.post("/myOrderData", async (req, res) => {
  try {

    let eId = await Order.findOne({ email: req.body.email });

    res.json({ orderData: eId });
  } catch (error) {
    res.send("Error", error.message);
  }
});

module.exports = router;
