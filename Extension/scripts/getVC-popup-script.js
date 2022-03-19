"use strict";

const DPOP_ALG = "ES384";
var logedInInfo = "my_pass";
var _SignWith = "cloudKMS";

// Event Listeners
// Go back btn
document.getElementById("back_btn").addEventListener("click", function(){
	window.location.href = "../html/popup.html";
})


// send POST request for VC and update the local state
// credentialsState = {SavedCredentials: ["iss", "type", "aud", "downloadId", "filePath"]}
document.getElementById("getVC_btn").addEventListener("click", async function(){
	// send message to background script to ask for credential??

	// read the issuers url and the wallet pass and request a credential
	// POST request
	const _request = {
		"method": "POST",
		"IssuingURL": document.getElementById("issuer_url_input").value,
		"walletPass": document.getElementById("wallet_pass_input").value}

	if (_SignWith == "local") {
		// Generate keys locally and use them to create a dpop
		const keys = generateKeys(logedInInfo);
		keys.then(async ([pk_jwk, wraped_key]) => {
			// The encrypted private key
			const wrapedKey_data = JSON.stringify(Array.from(new Uint8Array(wraped_key)));
			// DPoP
			const dpop_jwt = await dpop(
				pk_jwk, 
				wrapedKey_data,
				_request.method, 
				_request.IssuingURL, 
				DPOP_ALG, 
				logedInInfo);

			// save the dpop value
			await browser.storage.local.set({dpop: dpop_jwt}, () => {console.log("Sved dpop")})
		})
	} else if (_SignWith == "cloudKMS") {
		console.log("Requesting Cloud KMS signature")
		// hard coded JWK. TODO: Request the jwk from the kms
		const pubJWK =  {
		    kty: 'EC',
		    crv: 'P-256',
		    x: 'y3CYg1dG8m26_H5ME4OVtprm0FbSvQNJg40hEFTo7gc',
		    y: '9EDHWviK-ZCjtw2ueE3tan-etPaKQ1YJ_XC2_-uMcLo'
		}

		// read access token for the KMS api
		const resCloudKms = await browser.storage.local.get(["cloudKMS"]);
		const accessToken = resCloudKms.cloudKMS.access_token

		// Key Info
		const KeyInfo_RSA = {
			project: "aueb-ztvc",
			locations: "global",
			keyRings: "test_key_ring",
			cryptoKeys: "test_key_rsa_raw",
			cryptoKeyVersions: 1,
		}

		const KeyInfo_EC = {
			project: "aueb-ztvc",
			locations: "global",
			keyRings: "test_key_ring",
			cryptoKeys: "test_key",
			cryptoKeyVersions: 1,
		}

		// Request the Pub Key
		const PubKeyReqBody = JSON.stringify({auth: {access_token: accessToken}, 
			                                  keyInfo: KeyInfo_EC})
		
		const pubKey = await fetch("http://127.0.0.1:3002/pubKey",
			{
				headers: {
					"Content-Type": "application/json",
					"Accept": "application/json"
				},
				method: "POST",
				body: PubKeyReqBody
			}
		).then((res) => {return res.json()})

		const JwkPubKey = pubKey.JWK
		// JwkPubKey.kty = "RS256"
		JwkPubKey.alg = "ES256"
		console.log("FETCHING PUB KEY = ", JwkPubKey)
		
		// Get the DPoP token to sign
		const dpopTokenEncoded = await dpop_token(
			JwkPubKey,
			_request.method, 
			_request.IssuingURL,
			"ES256")  //RS256
		console.log("DPOP TOKEN = ", dpopTokenEncoded)


		// Request Signature From Proxy
		const SignReqBody = JSON.stringify({auth: {access_token: accessToken},
											data: dpopTokenEncoded,
											keyInfo: KeyInfo_EC})

		const signature = await fetch("http://127.0.0.1:3002/signature",
			{
				headers: {
					"Content-Type": "application/json",
					"Accept": "application/json"
				},
				method: "POST",
				body: SignReqBody
			}
		)//.then((res) => {return res.json()})


		// TEST DIFFERENT ENCODINGS
		// const encoder = new TextEncoder()
		// const dpop_token_encoded = encoder.encode(dpopTokenEncoded)

		// const ArrayBuffer_Digest = await crypto.subtle.digest("SHA-256", dpop_token_encoded)


		// const base64_digest = _arrayBufferToBase64(ArrayBuffer_Digest)
		
		// const base64url_digest = arrayBufferToBase64url(ArrayBuffer_Digest);

		// const hashArray_digest = Array.from(new Uint8Array(ArrayBuffer_Digest));
		// const hashHex_digest = hashArray_digest.map(b => b.toString(16).padStart(2, '0')).join('');
		

		// const base64_plain = btoa(Array.from(new Uint8Array(dpop_token_encoded)))

		// const base64url_plain = arrayBufferToBase64url(dpop_token_encoded)

		// console.log("RES CLOUD KMS data_to_sign = ", base64_digest)
		


		// // -- Req Signature
		// const KMS_signature = await requestSignature(base64_digest, KeyInfo_EC, accessToken);

		// const JSONsignature = JSON.parse(KMS_signature)
		// console.log("RES CLOUD KMS SIGNATURE = ", JSONsignature)

		// // Base 64 URL encoding of the signature
		// const signatureBase64url =  JSONsignature["signature"]
		// 	.replace(/\+/g, '-')
		// 	.replace(/\//g, '_')
		// 	.replace(/=+$/, '');
		
		// // DPoP
		// const dpop_jwt = dpopTokenEncoded + "." +signatureBase64url;

		// console.log("DPOP JWT = ", dpop_jwt)

		// // save the dpop value
		// await browser.storage.local.set({dpop: dpop_jwt}, () => {console.log("Sved dpop")})
	}
	
	const _dpop = await browser.storage.local.get(["dpop"]);
	_request["dpop"] = _dpop.dpop;

	const credential = fetchCredential(_request);

	// resolve credential and save to file system
	credential.then(async (data) => {
		var vcs = data.vc;

		// If vcs are not a list but a single vc
		vcs = typeof vcs == "string" ? [vcs] : vcs;

		for (const vc of vcs){ 
			var newVCstate = {}
			// decode credential JWT and save iss and type to the state
			console.log("VC = ", vc)
			const vcJWTpayload = parseJwt(vc)

			if (vcJWTpayload.iss && vcJWTpayload.vc.type && vcJWTpayload.aud){
				newVCstate.iss = vcJWTpayload.iss;
				newVCstate.type = vcJWTpayload.vc.type;
				newVCstate.aud = vcJWTpayload.aud
			}

			newVCstate.payload = data.vc;
			newVCstate.keys = {pubKey: pk_jwk, wrapedKey: wrapedKey_data};
			console.log("NEW VC STATE = ", newVCstate)
			await browser.storage.local.get(["SavedCredentials"]).then(async (res) => {
				let state = res.SavedCredentials? res.SavedCredentials:[];		
				state.push(newVCstate);
				await browser.storage.local.set({"SavedCredentials": state})
			})	
			
			// If the credential is for an issuer that is not already saved, save the issuer
			await browser.storage.local.get(["issuers"]).then(async (res) => {
				let issuers = res.issuers ? res.issuers : [];
				let found = false;
				for (const issuer of issuers) {
					const issuerUrl = issuer.url;
					if (issuerUrl.indexOf(newVCstate.iss)>-1) {found = true};
				}

				if (!found) {
					const issURL = new URL(newVCstate.iss);
					issuers.push({name: issURL.hostname, url: _request.IssuingURL});
					await browser.storage.local.set({"issuers": issuers})
				}
			})
				
		}
		window.location.href = "../html/getVC_success.html"
	}).catch(error => {
		alert("Resolving Credential Error")
		console.log("getVC-popup-script.js: Error: ", error)
	});
  }
)


// get the "issuersURL" local variable and if not empty (is only set when a issuer element 
// in the Issuers_list_ul of popup.html is clicked) set it as defaul value to the issuers url 
// input
browser.storage.local.get(["issuersURL"], function(res) {
	if (res.issuersURL && res.issuersURL !== null) {
		//TODO: check if res is valid url
		document.getElementById("issuer_url_input").value = res.issuersURL
	}
})
//set the "issuersURL" to null again
browser.storage.local.set({"issuersURL": null})

// POST the issuing end point for a credential, returns a promise
async function fetchCredential(request) {

	const POSTconfig = {
		credentials: 'include',
		headers: {
	    	Authorization: 'Basic '+btoa(request.walletPass),
			dpop: request.dpop,
	        'Content-Type': 'application/x-www-form-urlencoded'
	        },
	    body: "grant_type=client_credentials",
	    method: request.method};

    return fetch( request.IssuingURL, POSTconfig)
    .then(res => {
		console.log("RESULT = ", res)
		return res.json()})
    .then(data => {
		console.log("RECEIVED CREDENTIAL = ", data)
    	return data});
}


function parseJwt (token) {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
};
