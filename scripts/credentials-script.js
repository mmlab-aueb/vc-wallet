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
        const display = {Issuer: VCstate.iss, Audience: VCstate.aud, Type: VCstate.type}
        alert(JSON.stringify(display, null, 2))
      };

    })
  })


function DOMaddVC(newVC, HTML_li_id, vc_ul) {
//   document.getElementById("vcsList_initial_msg_p").innerText = null;
  const new_vc_li = document.createElement("li")
  new_vc_li.id = HTML_li_id
  new_vc_li.setAttribute("class", "saved")
  new_vc_li.appendChild(document.createTextNode(newVC.type[1] + " , " + newVC.iss + " , " + newVC.aud));

  //add the new list element
  vc_ul.appendChild(new_vc_li)
}


// read the saved issuers and vcs and display them in the popup
const main = () => {
  // read and display the saved VCs state
  chrome.storage.local.get(["SavedCredentials"], function(res) {
    console.log("credentials-script.js: read SavedCredentials state ", res.SavedCredentials)

    if (res.SavedCredentials && res.SavedCredentials.length>0){
      var HTML_li_id=0;
      const vc_ul = document.getElementById("VCs_list_ul");
      res.SavedCredentials.forEach((element) => {
        DOMaddVC(element, HTML_li_id, vc_ul);
        HTML_li_id += 1;
      })
    };
  })
}

main()