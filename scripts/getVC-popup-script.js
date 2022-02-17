"use strict";

const DPOP_ALG = "ES384";
var logedInInfo = "my_pass";

// Event Listeners
// Go back btn
document.getElementById("back_btn").addEventListener("click", function(){
	window.location.href = "../html/popup.html";
})


// send POST request for VC and update the local state
// credentialsState = {SavedCredentials: ["iss", "type", "aud", "downloadId", "filePath"]}
document.getElementById("getVC_btn").addEventListener("click", function(){
	// send message to background script to ask for credential??

	// read the issuers url and the wallet pass
	// POST request
	const _request = {
		"method": "POST",
		"IssuingURL": document.getElementById("issuer_url_input").value,
		"walletPass": document.getElementById("wallet_pass_input").value}

	// Generate keys and use them to create a dpop
	const keys = generateKeys(logedInInfo);

	keys.then(async ([pk_jwk, wraped_key]) => {
		const wrapedKey_data = JSON.stringify(Array.from(new Uint8Array(wraped_key)));

		const dpop_jwt = await dpop(
			pk_jwk, 
			wrapedKey_data,
			_request.method, 
			_request.IssuingURL, 
			DPOP_ALG, 
			logedInInfo);
		
		_request["dpop"] = dpop_jwt

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
