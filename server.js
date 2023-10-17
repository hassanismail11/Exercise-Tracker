const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

const port = process.env.port || 3000;

const mySecret = process.env['MONGO_URI']
const mongoose = require("mongoose")

const { Schema } = mongoose;

const UserSchema = new Schema({
  username: String
});

const User = mongoose.model("User", UserSchema);

const ExerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date
});

const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.get("/api/users", async (req, res) => {
  const users = await User.find({}).select("_id username");
  if (!users) {
    res.send("No users");
  } else {
    res.json(users);
  }
})


app.post("/api/users", async (req, res) => {
  const userObj = new User({ username: req.body.username });
  try {
    const user = await userObj.save();
    res.json(user);
  } catch (error) {
    console.log(error);
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) {
      res.send("Could not find user");
    } else {
      const exerciseObj = new Exercise({
        user_id: id,
        description,
        duration,
        date: date ? new Date(date) : new Date()
      })
      const exercise = await exerciseObj.save();
      res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString()
      })
    }
  } catch (error) {
    console.log(error);
    res.send("There was an error");
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;
  const user = await User.findById(id);
  if (!user) {
    res.send("Could not find user");
    return
  };

  let dateObj = {};
  if (from) {
    dateObj["$gte"] = new Date(from);
  };
  if (to) {
    dateObj["$lte"] = new Date(to);
  };
  let filter = {
    user_id: id
  };
  if (from || to) {
    filter.date = dateObj;
  };

  const exercises = await Exercise.find(filter).limit(+limit ?? 500);

  const log = exercises.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }))

  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log
  });
});


const start = async () => {
  mongoose.connect(mySecret, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const connection = mongoose.connection;
  connection.on("error", console.error.bind(console, "connection error:"));
  connection.once("open", () => {
    console.log("Connected Successfully");
  });

  app.listen(port, () => {
    console.log(`Server is listening on port ${port}...`);
  })
}

start();
