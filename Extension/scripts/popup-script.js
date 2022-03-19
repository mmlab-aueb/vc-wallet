let user = false;
let org = false;

// Event Listeners
document.getElementById("addIssuer_btn").addEventListener("click", function() {
    window.location.href = "../html/addIssuer_popup.html"
})


document.getElementById("getVC_btn").addEventListener("click", function() {
  window.location.href = "../html/getVC_popup.html"
})

function updateDisp(user, org) {
  const user_disp = document.getElementById("user-display-id")
  const org_disp = document.getElementById("org-display-id")
  if (user_disp && org_disp){
    user_disp.innerText = user;
    org_disp.innerText = org;
  }
}


if (!(user && org)) {
  browser.storage.local.get(["userInfo"], (res) => {
    if (res.userInfo.username && res.userInfo.org) {
      user = res.userInfo.username;
      org = res.userInfo.org;
      updateDisp(user, org);
    }
  })
} else {
  updateDisp(user, org);
}