// Event Listeners
// Go back btn
document.getElementById("back_btn").addEventListener("click", function(){
	window.location.href = "../html/popup.html";
})


// send POST request for VC and update the local state
// credentialsState = {SavedCredentials: ["iss", "type", "downloadId", "filePath"]}
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

		if (vcJWTpayload.iss && vcJWTpayload.vc.type){
			newVCstate.iss = vcJWTpayload.iss;
			newVCstate.type = vcJWTpayload.vc.type;
		}

 		// download the vc to file system
 		chrome.downloads.download({
 			url: "data:application/json;charset=utf-8,"+JSON.stringify(data),
 			filename: "Credential.json",
 			saveAs: true
 			}, function (downloadId) {
 				console.log("DOWNLOAD ID: ", downloadId);
 		 		newVCstate.downloadId = downloadId;
 		 	});
 	});

 	// update the local credentials state (credential type, issuer and where is saved on the file system)
 	// TODO: if the user change the locatiion of the VC open a "load" dialog and update the state
 	chrome.downloads.onChanged.addListener(function(downloadItem) {
	  if (newVCstate.downloadId && downloadItem.id && (newVCstate.downloadId == downloadItem.id)) {
	  	if (downloadItem.filename) {
	  		// Get the local state and append the new value (TODO: find a beter way, waybe localStorage)]
	  		chrome.storage.local.get(["SavedCredentials"], function(res) {
	  			let state = [];
	  			if (res.SavedCredentials) {
	  				state = res.SavedCredentials;
	  			}

	  			newVCstate.filePath = downloadItem.filename.current;

	  			state.push(newVCstate);
	  			console.log("Background.js state: ", state);

	  			chrome.storage.local.set({"SavedCredentials": state}, 
	  				// update state and return to main popup
	  				function() {
				  		console.log('Background.js: Updated local state', state);
				  		window.location.href = "../html/popup.html"

				  	});
	  		})
	  	}
	  }
	})
})


// Read the "issuersURL" local variable and if not empty (is only set when a issuer element 
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
	console.log(request.IssuingURL)
    const POSTconfig = {
	    credentials: 'include',
	    headers: {
	    	Authorization: 'Basic '+btoa('wallet:'+'qwerty'),
	        'Content-Type': 'application/x-www-form-urlencoded'
	        },
	    body: "grant_type=client_credentials",
	    method: 'POST'};

    return fetch( request.IssuingURL, POSTconfig)
    .then(res => res.json())
    .then(data => {
    	console.log("data from POSTing the IssuingURL = ", data);
    	return data})
    .catch(error=>{console.log(error)});
}


const parseJwt = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
};
