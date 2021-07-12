require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

const urlmap = {};
let count = 1;
let regex = /^https?:\/\/[\w+\.]*[a-zA-Z]+/i;
app.post("/api/shorturl", function(req,res){
  if(regex.test(req.body.url)){
    let urlToTest = req.body.url.replace(/https?:\/\/(www.)?/i,"").split("/")[0];
    dns.lookup(urlToTest, function(err,data){
    if(err) {
      console.log(err);
      console.log(data);
      res.json({ error: 'invalid url' });
      }
    else{
    urlmap[count] = req.body.url;
    count++;
    console.log(urlmap);    
    res.json({"original_url": req.body.url,"short_url": count-1});
    }
  });
  }
  else{
      res.json({ error: 'invalid url' });
  }
  
});

app.get("/api/shorturl/:shortId?", function(req,res){
  console.log(req.params.shortId);
  if(urlmap.hasOwnProperty(req.params.shortId)){
    res.redirect(urlmap[req.params.shortId]);
  }else{
    res.json("Not Found");
  }
});
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
