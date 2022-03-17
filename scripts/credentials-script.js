// click event for clicking to a VC in the Saved Credentials list
document.getElementById("VCs_list_ul").addEventListener("click",
  function(event) {
    const clicked_vc = event.target.innerText;
    console.log("EVENT = ", event.target.id);

    // get SavedCredentials state
    browser.storage.local.get(["SavedCredentials"], function(res){
      if (res.SavedCredentials){
        try{
          const VCstate = JSON.parse(res.SavedCredentials[event.target.id]);
          console.log("VCState = ", VCstate)

          const display = {Issuer: VCstate.iss, Audience: VCstate.aud, Type: VCstate.type}
          alert(JSON.stringify(display, null, 2))
        } catch {alert("Missing or corupted credential state")}
      };

    })
})

async function deleteVC(event) {
  if (confirm("Do you want to delete this credential??") == false) {return}
  await browser.storage.local.get(["SavedCredentials"], 
  async (res) => {
    const savedVCs = res.SavedCredentials;
    const VCjti = event.target.parentNode.id;
    delete savedVCs[VCjti];

    browser.storage.local.set({SavedCredentials: savedVCs}, () => {
      document.getElementById("VCs_list_ul").textContent = '';
      main()
    });
  });
};


function DOMaddVC(newVC, HTML_li_id, vc_ul) {
  const new_vc_li = document.createElement("li")
  new_vc_li.id = HTML_li_id
  new_vc_li.setAttribute("class", "saved")
  new_vc_li.setAttribute("style", "line-height: 24px;")
  new_vc_li.appendChild(document.createTextNode(newVC.type[1] + " , " + newVC.iss + " , " + newVC.aud));

  const li_div = document.createElement("div");
  // li_div.setAttribute("class", "flex-box");
  li_div.setAttribute("style", "vertical-align: middle;");

  // const li_div_p = document.createElement("p");
  // li_div_p.setAttribute("style", "height: 20px;")
  // li_div_p.appendChild(document.createTextNode(newVC.type[1] + " , " + newVC.iss + " , " + newVC.aud));
  // li_div.appendChild(li_div_p);

  const button = document.createElement("button");

  const delete_img = document.createElement("img")
  delete_img.setAttribute("src", "../assets/delete_icon.png")
  delete_img.setAttribute("class", "delBtn")
  delete_img.setAttribute("style", "vertical-align: middle; margin: 0; padding:0")

  button.appendChild(delete_img);

  // button.setAttribute("class", "delBtn")
  button.setAttribute("style", "margin: 0; padding:0; float: right")
  button.setAttribute("style", "vertical-align: middle;")

  button.setAttribute("id", ""+HTML_li_id);
  //button.setAttribute("onclick", "deleteVC(this)");
  button.addEventListener("click", deleteVC)
  li_div.appendChild(button);

  new_vc_li.appendChild(li_div)

  //add the new list element
  vc_ul.appendChild(new_vc_li)
}


// read the saved issuers and vcs and display them in the popup
function main() {
  // read and display the saved VCs state
  browser.storage.local.get(["SavedCredentials"], function(res) {
    const savedVCs = Object.values(res.SavedCredentials);
    const savedVCsMap = res.SavedCredentials;

    if (savedVCs && savedVCs.length > 0){
      const vc_ul = document.getElementById("VCs_list_ul");

      for (const JtiKey of Object.keys(savedVCsMap)) {
        var HTML_li_id = JtiKey;

        const savedVc = JSON.parse(savedVCsMap[JtiKey]);
        DOMaddVC(savedVc, HTML_li_id, vc_ul);
      }
    };
  })
}

main()