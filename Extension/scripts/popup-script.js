let user = false;
let org = false;
var access_token = "ya29.A0ARrdaM-JKY0v06C9h5gamuzB4PIxT_hU2XWw843bZlXcB0LXsgGhk2ap6HV_B1GFsHgGS-BygEu_Uc1DDWROmgaAzafj22hA3mVb_B165J7iLpm67cMoP2Ju4ImlWQZkk9bIfRXP2o3npTlonfhlN_D68NRh";
var API_KEY = 'AIzaSyBSdER1XE7nahA__wFsR8MW92bevaCyKKU'

// Event Listeners
document.getElementById("addIssuer_btn").addEventListener("click", function() {
    window.location.href = "../html/addIssuer_popup.html"
})


document.getElementById("getVC_btn").addEventListener("click", function() {
  window.location.href = "../html/getVC_popup.html"
})

document.getElementById("test_kms").addEventListener("click", RequestAccessToken)

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


function RequestAccessToken(){
  // send message to background to request a access token
  browser.runtime.sendMessage({
    GoogleKMSaccessToken: "TOKEN_REQUEST"
  })
}


function GoogleKMS_SignatureRequest() {
  var api_endpoint = 'https://cloudkms.googleapis.com/v1/'
  var name = 'projects/aueb-ztvc/locations/global/keyRings/test_key_ring/cryptoKeys/test_key/cryptoKeyVersions/1';
  var operation = 'asymmetricSign'

  const fetch_url = api_endpoint + name + ':' + operation + '?key=' + API_KEY
  //var params = access_token
  if (access_token) {
    //console.log(" ---->>> PARAMS = ", params)
    const _postConf = {
      //credentials: 'include',
      headers: {
        Authorization: 'Bearer ' + access_token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'        
      },
      body:'{"data": "SEVMTE8="}',
      method: 'POST'
    }

     fetch(fetch_url, _postConf)
     .then((res) => {
      console.log("FETCH RESULT = ", res)
      if (res.status == 401) {
        oauthSignIn()
      }
      return res.body
     })
     .then((body) => {
      console.log("RESULT BODY = ", body)
      const reader = body.getReader()

      return new ReadableStream({
        start(controller) {

          function push() {
            reader.read().then(({done, value}) => {
              if (done) {
                controller.close()
                return;
              }

              controller.enqueue(value);
              push();
            })
          }

        push();
        }
      })
     })
     .then((stream) => {
        return new Response(stream, { headers: { "Content-Type": "text/html" } }).text();
      })
      .then((result) => {
        console.log("FETCH STREAM RESULT = ", result)
      })
  } else {
    // oauthSignIn()
    alert("NEEDS ACCESS TOKEN")
  }
}