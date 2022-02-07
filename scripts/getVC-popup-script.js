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
	// read the issuers url and the wallet pass
	// POST request
	const _request = {"IssuingURL": document.getElementById("issuer_url_input").value,
					 "walletPass": document.getElementById("wallet_pass_input").value}
	const credential = fetchCredential(_request);

	// The new values to save as state
	const newVCstate = {}

	// resolve credential and save to file system
	credential.then((data) => {
		
		// decode credential JWT and save iss and type to the state
		vcJWTpayload = parseJwt(data.vc) 

		if (vcJWTpayload.iss && vcJWTpayload.vc.type && vcJWTpayload.aud){
			newVCstate.iss = vcJWTpayload.iss;
			newVCstate.type = vcJWTpayload.vc.type;
			newVCstate.aud = vcJWTpayload.aud
		}

		newVCstate.payload = data.vc;

		browser.storage.local.get(["SavedCredentials"], (res) => {
			let state = [];
			if (res.SavedCredentials) {
				state = res.SavedCredentials;};
		   
		   // update state and return to main popup
		   state.push(newVCstate);

		   // If the credential is for an issuer that is not already saved, save the issuer
		   browser.storage.local.get(["issuers"], (res) => {
			   let issuers = res.issuers ? res.issuers : [];
			   let found = false;
			   for (issuer of issuers) {
				   const issuerUrl = issuer.url;
				   if (issuerUrl.indexOf(newVCstate.iss)>-1) {found = true};
			   }

			   if (!found) {
				   const issURL = new URL(newVCstate.iss);
				   issuers.push({name: issURL.hostname, url: _request.IssuingURL});
				   browser.storage.local.set({"issuers": issuers}, () => {
				   })
			   }
		   })

		   browser.storage.local.set({"SavedCredentials": state}, () => {
			   window.location.href = "../html/getVC_success.html"
			});
		   })

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
	const _htm = "POST"

	//Get DPoP for Issuer
	const keys = await browser.storage.local.get(["pubKey", "wrapedKey"]);
	const pubKey = keys.pubKey;
	const wrapedKey = keys.wrapedKey;
	const dpop_jwt = await dpop(pubKey, {method: _htm}, request.IssuingURL, DPOP_ALG, wrapedKey, logedInInfo)
	console.log("FETCHING WITH PUB KEY = ", pubKey)

	const POSTconfig = {
		credentials: 'include',
		headers: {
	    	Authorization: 'Basic '+btoa(request.walletPass),
			dpop: dpop_jwt,
	        'Content-Type': 'application/x-www-form-urlencoded'
	        },
	    body: "grant_type=client_credentials",
	    method: _htm};

    return fetch( request.IssuingURL, POSTconfig)
    .then(res => res.json())
    .then(data => {
		console.log("RECEIVED CREDENTIAL = ", data)
    	return data});
}


const parseJwt = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
};
