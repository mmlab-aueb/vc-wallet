// click event for clicking to an issuer in the Saved Issuers list
document.getElementById("Issuers_list_ul").addEventListener("click",
  function(event) {
    const clicked_issuer = event.target.innerText;
    // save the issuer name to a variable in local storage and open the getVC_popup.html
    // Get the clicked issuers url
    const issuerConf = clicked_issuer.split(" : ", 2) //TODO: Check for escaping characters
    browser.storage.local.set({"issuersURL": issuerConf[1]})
    window.location.href = "../html/getVC_popup.html"
});


// format the Issuers and VCs areas in the DOM
function DOMaddIssuer(issuer_name, issuer_URL) {  
    //Delete the initial message of the saved issuers div
    // document.getElementById("issList_initial_msg_p").innerText = null;
  
    const issuers_ul = document.getElementById("Issuers_list_ul");
  
    const new_issuer_li = document.createElement("li")
    new_issuer_li.id = "issuer_li";
    new_issuer_li.setAttribute("class", "saved")
    new_issuer_li.appendChild(document.createTextNode(issuer_name + " : " + issuer_URL));
    // add the new list elemnt
    issuers_ul.appendChild(new_issuer_li)
};


// read the saved issuers and vcs and display them in the popup
const main = () => {
    // read and display the issuers state
    browser.storage.local.get(["issuers"], function(res) {
  
      // have to "re-write" all the issuers because the popup resets on each click
      if (res.issuers && res.issuers.length>0) {
        const new_issuer = res.issuers.forEach((element) => DOMaddIssuer(element.name, element.url));
      }
    })
  }
  
  main()
  