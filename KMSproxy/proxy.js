"use strict";

// const express = require('express')
// const https = require('https')
// const path = require('path')
// var cookieParser = require('cookie-parser');
// const bodyParser = require("body-parser");


import fetch from 'node-fetch'
import express from 'express'
import https from 'https'
import path from 'path'
import {fileURLToPath} from 'url'
import cookieParser from 'cookie-parser';
import bodyParser from "body-parser";
import keyutil from 'js-crypto-key-utils'

const app = express()
const router = express.Router();


const port = 3002

const USER_ORG = "mmlab";
const VC_TYPE = "cloudStorage";

// ---- Routs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Helpers
function streamToString (stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  })
}


app.use("/", express.static(path.join(__dirname, 'public')))


// parse application/json
app.use(bodyParser.json())

// app.use("/token", express.static(path.join(__dirname, 'public')))

app.post("/token", (req, res) => {
	console.log("Requested a token. Body = ", req.body)
	console.log("Requested a token. Headers = ", req.headers)
	if (req.headers.origin == 'moz-extension://be2ebe2d-fbd4-42b7-b743-211f4bb4b3b0') {
		console.log("ACCEPTED")
		// Read DPoP to Sign

		// Request Signing from Google KMS

		// 			If access token is invalid, return request for login in

		// Respond with signature
	}
})

app.post("/pubKey", async (req, res) => {
	if (req.headers.origin == 'moz-extension://fb8dd0f3-1fd3-4c01-99c7-a281247932a7') {
		console.log("ACCEPTED")
		var _API_KEY = 'AIzaSyBSdER1XE7nahA__wFsR8MW92bevaCyKKU'
		var _API_ENDPOINT = 'https://cloudkms.googleapis.com/v1/' //https://

		let http_request = "";
		let access_token = "";
		try {
			// const JSONbody = req.body;

			// Read access token for request
			access_token = req.body.auth.access_token;

			// Read key params
			const project = req.body.keyInfo.project;
			const locations = req.body.keyInfo.locations;
			const keyRings = req.body.keyInfo.keyRings;
			const cryptoKeys = req.body.keyInfo.cryptoKeys;
			const cryptoKeyVersions = req.body.keyInfo.cryptoKeyVersions;

		  http_request = `projects/${project}/locations/${locations}/keyRings/${keyRings}/cryptoKeys/${cryptoKeys}/cryptoKeyVersions/${cryptoKeyVersions}/publicKey`

		} catch (e) {console.log("Invalid Request for Pub Key: ", e)}

		// Request the Publick Key
		const _getConf = {
			headers: {
				Authorization: 'Bearer '+access_token,
				"Accept": "application/json",
				"Content-Type": "application/json"
			},
			method: "GET"
		}

		const PubKey = fetch(_API_ENDPOINT + http_request + `?key=` +_API_KEY, _getConf)
		.then((PubRes) => {
			return PubRes.body
		})
		.then(async (body) => {
			// Read the ressult stream
			const result = await streamToString(body)
			console.log("RESULT = ", result)
			return result
		})

		const PemPubKey = JSON.parse(await PubKey);
		console.log("PEM KEY = ", PemPubKey.pem)

		// Transform to JWK
		const keyObjFromPem = new keyutil.Key('pem', PemPubKey.pem);
		let JwkPubKey;
		if(!keyObjFromPem.isEncrypted) JwkPubKey = await keyObjFromPem.export('jwk');
		console.log("JWK = ", JwkPubKey)

		// Respond with JWK
		//res.setHeader("Content-Type", "application/json").send(JSON.stringify({JWK: JwkPubKey}))
		res.json({JWK: JwkPubKey})
	}
})


// ---- Starting
app.listen(port, () => {
  console.log(`KMS API proxy listening at http://localhost:${port}`)
})