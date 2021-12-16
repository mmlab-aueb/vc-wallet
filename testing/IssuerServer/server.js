const express = require('express')
const path = require('path')
const app = express()
const bodyParser = require("body-parser");
const router = express.Router();

const port = 3000

const USER_ORG = "mmlab";
const VC_TYPE = "cloudStorage";

// ---- Midleware
app.use("/getvc", express.static(path.join(__dirname, 'public')))

//configuring body-parser for POST requests
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/getvc/', (req, res)=> {
  console.log("Request for ", req.body);
  
  const VC = {
              type: VC_TYPE,
              org: USER_ORG,
              iss: "localhost:3000/getvc/",
              credentialSubject: {
                capabilities: ["READ", "WRITE"]}
            }

  res.json({vc: btoa(JSON.stringify(VC))});
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
