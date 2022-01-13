// Event Listeners
// Go back btn
document.getElementById("back_btn").addEventListener("click", function(){
	window.location.href = "../html/popup.html";
})


// send POST request for VC and update the local state
// credentialsState = {SavedCredentials: ["iss", "type", "aud", "downloadId", "filePath"]}
document.getElementById("getVC_btn").addEventListener("click", function(){
	// read the issuers url and the wallet pass
	const request = {"IssuingURL": document.getElementById("issuer_url_input").value,
					 "walletPass": document.getElementById("wallet_pass_input").value};

	// POST request
	const credential = fetchCredential(request);

	// The new values to save as state
	const newVCstate = {}

	// resolve credential and save to file system
	credential.then((data) => {
		console.log("Credential to save: ", data);
		
		// decode credential JWT and save iss and type to the state
		vcJWTpayload = parseJwt(data.vc)

		console.log("Credential payload to save: ", vcJWTpayload)

		if (vcJWTpayload.iss && vcJWTpayload.vc.type && vcJWTpayload.aud){
			newVCstate.iss = vcJWTpayload.iss;
			newVCstate.type = vcJWTpayload.vc.type;
			newVCstate.aud = vcJWTpayload.aud
		}

		newVCstate.payload = data.vc;

		chrome.storage.local.get(["SavedCredentials"], (res) => {
			let state = [];
			if (res.SavedCredentials) {
				state = res.SavedCredentials;};
		   
		   // update state and return to main popup
		   state.push(newVCstate);

		   // If the credential is for an issuer that is not already saved, save the issuer
		   chrome.storage.local.get(["issuers"], (res) => {
			   console.log("issuers res = ", res);
			   let issuers = res.issuers ? res.issuers : [];
			   let found = false;
			   for (issuer of issuers) {
				   const issuerUrl = issuer.url;
				   if (issuerUrl.indexOf(newVCstate.iss)>-1) {found = true};
			   }

			   if (!found) {
				   const issURL = new URL(newVCstate.iss);
				   issuers.push({name: issURL.hostname, url: newVCstate.iss});
				   chrome.storage.local.set({"issuers": issuers}, () => {
					   console.log("getVC-popup-script.js: added a new issuer to the issuers state")
				   })
			   }
		   })

		   chrome.storage.local.set({"SavedCredentials": state}, () => {
			   console.log('getVC-popup-script.js: Updated local state', state);
			   //window.location.href = "../html/getVC_success.html"
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
chrome.storage.local.get(["issuersURL"], function(res) {
	console.log(res)
	if (res.issuersURL && res.issuersURL !== null) {
		//TODO: check if res is valid url
		document.getElementById("issuer_url_input").value = res.issuersURL
	}
})
//set the "issuersURL" to null again
chrome.storage.local.set({"issuersURL": null})

// POST the issuing end point for a credential, returns a promise
async function fetchCredential(request) { //TODO: SECURE THAT <<<<<<<<<<<<<<
	console.log(request.IssuingURL);
	const POSTconfig = {
		credentials: 'include',
		headers: {
	    	Authorization: 'Basic '+btoa(request.walletPass),
	        'Content-Type': 'application/x-www-form-urlencoded'
	        },
	    body: "grant_type=client_credentials",
	    method: 'POST'};

    return fetch( request.IssuingURL, POSTconfig)
    .then(res => res.json())
    .then(data => {
    	console.log("data from POSTing the IssuingURL = ", data);
    	return data});
}


const parseJwt = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
};
