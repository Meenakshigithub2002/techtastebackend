global.foodData = require("./db")(function call(err, data, CatData) {
  if (err) console.log(err);
  global.foodData = data;
  global.foodCategory = CatData;
});

const express = require("express");
const FoodData = require("./models/FoodData");
const order = require("./models/Orders");
const app = express();
const cors = require("cors")

const port = 5000;
app.use(cors())
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://techtastefrontend.onrender.com");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/foodData", async (req, res) => {
  const data = await FoodData.find({});
  res.send(data);
});

app.get("/allorders", async (req, res) => {
  let orders = await order.find().sort({ createdAt: 1 });
  res.status(200).send(orders)
});
app.post("/allordersdelete", async (req, res) => {
  let orders = await order.remove({})
  res.status(200).send(orders)
});

app.post("/delete-product-by-id/:id", async (req, res) => {
  try {
    const Id = req.params.id
    const isExists = await FoodData.findOne({ _id: Id })
    if (isExists) {
      const deletedproduct = await FoodData.findOneAndDelete({ _id: Id })
      console.log(deletedproduct);
    } else {
      res.status(401).send({ message: "Please enter valid productId" })
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Something went wrong" })
  }

});


app.use("/api/auth", require("./Routes/Auth"));

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
