// Event Listeners
// Go back btn
document.getElementById("back_btn").addEventListener("click", 
	function() {
		window.location.href = "../html/popup.html"
})

// Save an issuer btn
const save_issuer_btn = document.getElementById("saveIssuer_btn")
if (save_issuer_btn) {
	save_issuer_btn.addEventListener("click", function() {
		//Get values passed by the holder
		const issuer_name = document.getElementById("IssuersName_input").value;
		const issuer_url = document.getElementById("IssuerEndPoint_input").value;
		//TODO: Sanitize the inputs

		// add issuer to state
		// get the saved issuers, append the new one and save the result
		browser.storage.local.get(["issuers"], function(result) {
			const newIssuer = {"name": issuer_name,
							   "url": issuer_url}

		    saved_issuers = result.issuers;
			

			if (saved_issuers && saved_issuers.length > 0) {
				saved_issuers.push(newIssuer)
			} else {saved_issuers = [newIssuer]}
			
			//save the new issuer to the state			
			browser.storage.local.set({"issuers": saved_issuers},
				function() {
					window.location.href = "../html/popup.html"
				})
		})
	})
}
