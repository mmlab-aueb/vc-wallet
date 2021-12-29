const express = require('express')
const path = require('path')
const app = express()
var cookieParser = require('cookie-parser');
const bodyParser = require("body-parser");
const router = express.Router();

const port = 3001;
var pictInt = 0;

// ---- Midleware
app.use(cookieParser());

// ---- Routs
app.use("/", express.static(path.join(__dirname, 'public')))

app.use("/photos", express.static(path.join(__dirname, "data/photos")))

// ---- Handlers
app.get("/photos", (req, res) => {
  pictInt += 1
  const photoNum = 1 + pictInt%2 
  console.log("Requested a photo " + photoNum + ": ",req.body, req.headers)

  // check for Authorization and dpop headers. If not present send 401 and the 
  // resource that requests a credential. 
  if (req.headers.authorization && req.headers.dpop){
    // Supposedly auth is valid, return photo
    // TODO: Also return a secure cookie for that session
    res.sendFile(path.join(__dirname, 'data/photos/photo_' + photoNum + '.jpg'))
  }
  else {
    res.setHeader('WWW-Authenticate', 'Basic realm="/photos"')
       .status(401)
       .send("Credential Required")
  }
})

// ---- Starting
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
