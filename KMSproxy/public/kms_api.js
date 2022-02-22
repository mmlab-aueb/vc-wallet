"use strict";

console.log("HELLO WORLD! 2")

var YOUR_CLIENT_ID = '584707370383-koevitlcb3v6u23jkdvd22ant4a3pjn2.apps.googleusercontent.com';
var YOUR_REDIRECT_URI = 'http://127.0.0.1:3002';
var SCOPES = ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/cloudkms'];
var fragmentString = location.hash.substring(1);
var API_KEY = 'AIzaSyBSdER1XE7nahA__wFsR8MW92bevaCyKKU'

// Parse query string to see if page request is coming from OAuth 2.0 server.
var params = {};
var regex = /([^&=]+)=([^&]*)/g, m;
while (m = regex.exec(fragmentString)) {
  params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
}
if (Object.keys(params).length > 0) {
  localStorage.setItem('oauth2-test-params', JSON.stringify(params) );
  if (params['state'] && params['state'] == 'try_sample_request') {
    trySampleRequest();
  }
}


function trySampleRequest(){
  var api_endpoint = 'https://cloudkms.googleapis.com/v1/'
  var name = 'projects/aueb-ztvc/locations/global/keyRings/test_key_ring/cryptoKeys/test_key/cryptoKeyVersions/1';
  var params = JSON.parse(localStorage.getItem('oauth2-test-params'));
  if (params && params['access_token']) {
    console.log(" ---->>> PARAMS = ", params)
    const _postConf = {
      //credentials: 'include',
      headers: {
        Authorization: 'Bearer '+params['access_token'],
        'Content-Type': 'application/json',
        'Accept': 'application/json'        
      },
      body:'{"data": "SEVMTE8="}',
      method: 'POST'
    }

     fetch(api_endpoint+name+':asymmetricSign' + '?key='+API_KEY, _postConf)
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
    oauthSignIn()
  }
}



/*
 * Create form to request access token from Google's OAuth 2.0 server.
 */
function oauthSignIn() {
  console.log(" ------------------------ IN OAUTH SIGININ ---------------------------------")
  // Google's OAuth 2.0 endpoint for requesting an access token
  var oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';

  // Create <form> element to submit parameters to OAuth 2.0 endpoint.
  var form = document.createElement('form');
  form.setAttribute('method', 'GET'); // Send as a GET request.
  form.setAttribute('action', oauth2Endpoint);

  // Parameters to pass to OAuth 2.0 endpoint.
  var params = {'client_id': YOUR_CLIENT_ID,
                'redirect_uri': YOUR_REDIRECT_URI,
                'response_type': 'token',
                'scope': 'https://www.googleapis.com/auth/cloudkms',
                'include_granted_scopes': 'true',
                'state': 'try_sample_request'};

  // Add form parameters as hidden input values.
  for (var p in params) {
    var input = document.createElement('input');
    input.setAttribute('type', 'hidden');
    input.setAttribute('name', p);
    input.setAttribute('value', params[p]);
    form.appendChild(input);
  }

  // Add form to page and submit it to open the OAuth 2.0 endpoint.
  document.body.appendChild(form);
  form.submit();
}