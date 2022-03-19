"use strict";

/**
 * Display the credential
 */
async function displayVC(event) {
  await browser.storage.local.get(["SavedCredentials"], (res) => {
    try{
      const VCid = event.target.id;
      const VCstate = JSON.parse(res.SavedCredentials[VCid]);

      const VCdisplay = {
        Issuer: VCstate.iss,
        Audience: VCstate.aud,
        Type: VCstate.type
      }

      alert(JSON.stringify(VCdisplay, null, 2));
    }
    catch(e) {
      // If the state didn't parse
      if (e instanceof SyntaxError){
        alert("Could not parse credential's state");
      } 
      else { alert("Could not read credential's state: " + e); }
    }
  })
}


/**
 * Delete a credential from the state and remove it from the display
 * @param {*} event click event on the delete button
 * @returns null if the user does not confirm the delete
 */
async function deleteVC(event) {
  event.stopPropagation(); // TODO: Stop bubbling using different html el id's
  if (confirm("Do you want to delete this credential??") == false) {return}
  await browser.storage.local.get(["SavedCredentials"], 
  async (res) => {
    const savedVCs = res.SavedCredentials;
    const VCjti = event.target.id;
    console.log(event);
    delete savedVCs[VCjti];

    browser.storage.local.set({SavedCredentials: savedVCs}, () => {
      document.getElementById("VCs_list_ul").textContent = '';
      main()
    });
  });
};


/**
 * Display a vc as a list element.
 * @param {*} newVC the vc to add
 * @param {*} HTML_li_id the id to give the html list element, usually the jti of the VC
 * @param {*} vc_ul the list html element
 */
function DOMaddVC(newVC, HTML_li_id, vc_ul) {
  const new_vc_li = document.createElement("li")
  new_vc_li.id = HTML_li_id
  new_vc_li.setAttribute("class", "saved")
  new_vc_li.setAttribute("style", "line-height: 24px;")
  new_vc_li.appendChild(document.createTextNode(newVC.type[1] + " , " + newVC.iss + " , " + newVC.aud));

  // Creating an endey to display the saved vc
  const li_div = document.createElement("div");
  li_div.setAttribute("style", "vertical-align: middle;");

  const button = document.createElement("button");

  const delete_img = document.createElement("img")
  delete_img.setAttribute("src", "../assets/delete_icon.png")
  delete_img.setAttribute("class", "delBtn")
  delete_img.setAttribute("style", "vertical-align: middle; margin: 0; padding:0")

  button.appendChild(delete_img);
  button.setAttribute("style", "margin: 0; padding:0; float: right")
  button.setAttribute("style", "vertical-align: middle;")

  delete_img.setAttribute("id", ""+HTML_li_id);
  button.addEventListener("click", deleteVC)
  li_div.appendChild(button);

  new_vc_li.appendChild(li_div)

  //add the new list element
  vc_ul.appendChild(new_vc_li)
}


/**
 * read the saved issuers and vcs and display them in the popup
 */
function main() {
  const vc_ul = document.getElementById("VCs_list_ul");
  vc_ul.addEventListener("click", displayVC)

  // read and display the saved VCs state
  browser.storage.local.get(["SavedCredentials"], function(res) {
    const savedVCs = Object.values(res.SavedCredentials);
    const savedVCsMap = res.SavedCredentials;

    if (savedVCs && savedVCs.length > 0){
      // const vc_ul = document.getElementById("VCs_list_ul");

      for (const JtiKey of Object.keys(savedVCsMap)) {
        var HTML_li_id = JtiKey;

        const savedVc = JSON.parse(savedVCsMap[JtiKey]);
        DOMaddVC(savedVc, HTML_li_id, vc_ul);
      }
    };
  })
}

main()