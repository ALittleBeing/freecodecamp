const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
require('dotenv').config()
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  logs: [{
    description: String, duration: Number,
    date: Date
  }]
});
let User = mongoose.model('User', userSchema);

const CheckUserExistByName = (name, done) => {
  User.count({ username: name }, function(err, count) {
    if (err) return done(err);
    done(null, count);
  });
};

const CreateUser = (userName, done) => {
  CheckUserExistByName(userName, function(err, count) {
    if (err) return done(err);
    if (count > 0) return done("taken");
    let newUser = new User({ username: userName, logs: [] });
    newUser.save(function(err, data) {
      if (err) return done(err);
      done(null, data);
    });
  });

};

const GetAllUsers = (done) => {
  User.find({}, { logs: 0, __v: 0 }, function(err, data) {
    if (err) return done(err);
    done(null, data);
  });
};

const UpdateExerciseById = (userId, description, duration, date, done) => {
  User.findById(userId, function(err, data) {
    if (err) return done(err);
    data.logs.push({
      description: description,
      duration: parseInt(duration), date: date
    });
    data.save(function(err, data) {
      if (err) return done(err);
      done(null, data);
    });
  });
};

const GetLogsById = (userId, from, to, limit, done) => {
  let condition = { "_id": userId };
  let projection = { $and: []};
  let dateMatch = {};
  console.log("inputs: ", from, to, limit, "\n");
  if (from) {
  //console.log("from: ", from, typeof from,"\n");
    projection["$and"].push({ "$gte": ['$$item.date', new Date(from)] });
  }
  if (to) {
  //console.log("to: ",to, "\n");
    projection["$and"].push({ "$lte": ['$$item.date', new Date(to)] });
  }
  if (projection["$and"].length > 0) {
    console.log("executing aggregate function...\n");
    //console.log("projection: ", projection);
    let promise = User.aggregate([
    { "$match": { _id: mongoose.Types.ObjectId(userId) } },
    {
      "$project": {
        "logs": {
          "$filter": {
            input: '$logs',
            as: 'item',
            cond: projection
          }
        },
        "username": 1
      }
    }
  ]).exec();
  
  promise.then(function(result) {
    //console.log("\naggregate resutls: ", result);
    if(result.length>0) return done(null,result[0]);
    done(null,result);
  });

  promise.catch(function(err) {
    console.log("aggregate errors: ", err);
    done(err);
  });
  }
  else{
    User.findById(userId, { "logs._id": 0, __v: 0 }, {}, function(err, data) {
    if (err) return done(err);
    done(null, data);
  });
  }
};

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: "false" }));
app.use(function(req, res, next) {
  console.log(req.method + " " + req.path + " - " + req.ip);
  next();
});
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/users", function(req, res) {
  CreateUser(req.body.username, function(err, data) {
    if (err) {
      if (err == "taken") {
        res.send("Username already taken");
      }
      console.log(err);
      res.json("Something went wrong. Please try again.");
    }
    console.log("User created succesfully!", data);
    res.json({ "username": data.username, "_id": data._id });
  });
});

app.get("/api/users", function(req, res) {
  GetAllUsers(function(err, data) {
    if (err) {
      console.log(err);
      res.json("GetAllUsers - Something went wrong. Please try again.");
    }
    console.log("Retrieved all users succesfully!");
    res.json(data);
  });
});

app.post("/api/users/:_id/exercises", function(req, res) {
  let date;
  if (req.body.date) {
    date = new Date(req.body.date);
  }
  else {
    date = new Date();
  }
  UpdateExerciseById(req.params._id, req.body.description, req.body.duration, date, function(err, data) {
    if (err) {
      console.log(err);
      res.json("UpdateExercise - Something went wrong. Please try again.");
    }
    console.log("Updated user's exercise details succesfully!", data);
    let newObj = {
      "_id": data._id,
      "username": data.username,
      "date": date.toDateString(),
      "duration": parseInt(req.body.duration),
      "description": req.body.description
    };
    //console.log(newObj);
    res.json(newObj);
  });
});

app.get("/api/users/:_id/logs", function(req, res) {
  GetLogsById(req.params._id, req.query.from, req.query.to, req.query.limit, function(err, data) {
    if (err) {
      console.log(err);
      res.json("Something went wrong when retrieving logs. Please try again.");
    }
    
        
let logs = data.logs.map((obj) => ({
      description: obj.description,
      duration: obj.duration,
      date: new Date(obj.date).toDateString()
    }));
    if (parseInt(req.query.limit) > 0) {
      logs = logs.slice(0, parseInt(req.query.limit));
    };
    let newObj = {
      _id: data._id,
      username: data.username,
    };
    if(req.query.from){
      newObj["from"] = new Date(req.query.from).toDateString();
    }
    if(req.query.to){
      newObj["to"] = new Date(req.query.to).toDateString();
    }
    newObj["count"] = logs.length;
    newObj["log"] = logs;
    //console.log(newObj);
    console.log("Retrieved logs succesfully!", data);
    res.json(newObj);  
    
    
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
