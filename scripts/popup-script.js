// Event Listeners
document.getElementById("addIssuer_btn").addEventListener("click", function() {
    window.location.href = "../html/addIssuer_popup.html"
})


document.getElementById("getVC_btn").addEventListener("click", function() {
  window.location.href = "../html/getVC_popup.html"
})


// click event for clicking to an issuer in the Saved Issuers list
document.getElementById("Issuers_list_ul").addEventListener("click",
  function(event) {
    const clicked_issuer = event.target.innerText;
    // save the issuer name to a variable in local storage and open the getVC_popup.html
    // Get the clicked issuers url
    const issuerConf = clicked_issuer.split(" : ", 2) //TODO: Check for escaping characters
    chrome.storage.local.set({"issuersURL": issuerConf[1]})
    window.location.href = "../html/getVC_popup.html"
  })


// click event for clicking to a VC in the Saved Credentials list
document.getElementById("VCs_list_ul").addEventListener("click",
  function(event) {
    const clicked_vc = event.target.innerText;

    // get SavedCredentials state
    chrome.storage.local.get(["SavedCredentials"], function(res){
      if (res.SavedCredentials && res.SavedCredentials.length>0){
        // TODO: using the id of the <li> HTML ellement to retreive the state
        // of the cliced VC. Is that secure?? maybe change the state from a list
        // to a map??
        const VCstate = res.SavedCredentials[parseInt(event.target.id)];
        alert(JSON.stringify(VCstate, null, 2))
      };

    })
  })


// format the Issuers and VCs areas in the DOM
function DOMaddIssuer(issuer_name, issuer_URL) {  
  //Delete the initial message of the saved issuers div
  document.getElementById("issList_initial_msg_p").innerText = null;

  const issuers_ul = document.getElementById("Issuers_list_ul");

  const new_issuer_li = document.createElement("li")
  new_issuer_li.id = "issuer_li"
  new_issuer_li.appendChild(document.createTextNode(issuer_name + " : " + issuer_URL));
  // add the new list elemnt
  issuers_ul.appendChild(new_issuer_li)
}


function DOMaddVC(newVC, HTML_li_id) {
  document.getElementById("vcsList_initial_msg_p").innerText = null;

  const vc_ul = document.getElementById("VCs_list_ul");

  const new_vc_li = document.createElement("li")
  new_vc_li.id = HTML_li_id
  new_vc_li.appendChild(document.createTextNode(newVC.filePath.split("\\").at(-1) + " , "
   + newVC.type[1] + " , " + newVC.iss));

  //add the new list element
  vc_ul.appendChild(new_vc_li)
}


// read the saved issuers and vcs and display them in the popup
function main() {
  // read and display the issuers state
  chrome.storage.local.get(["issuers"], function(res) {
    console.log("popup-script.js: read issuers state ", res.issuers);

    // have to "re-write" all the issuers because the popup resets on each click
    if (res.issuers && res.issuers.length>0) {
      const new_issuer = res.issuers.forEach((element) => DOMaddIssuer(element.name, element.url));
    }

  })

  // read and display the saved VCs state
  chrome.storage.local.get(["SavedCredentials"], function(res) {
    console.log("popup-script.js: read SavedCredentials state ", res.SavedCredentials)

    if (res.SavedCredentials && res.SavedCredentials.length>0){
      var HTML_li_id=0;
      res.SavedCredentials.forEach((element) => {
        DOMaddVC(element, HTML_li_id);
        HTML_li_id += 1;
      })
    };
  })
}

main()
