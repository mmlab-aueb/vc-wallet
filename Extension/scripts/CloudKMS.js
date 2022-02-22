"use strict";

document.getElementById("request_btn").addEventListener("click", oauthSignIn)

var _CLIENT_ID = '584707370383-koevitlcb3v6u23jkdvd22ant4a3pjn2.apps.googleusercontent.com';
var _REDIRECT_URI = 'http://127.0.0.1:3002';
var SCOPES = ['https://www.googleapis.com/auth/cloud-platform',
                'https://www.googleapis.com/auth/cloudkms'];


var fragmentString = location.hash.substring(1);

// Parse query string to see if page request is coming from OAuth 2.0 server.
var params = {};
var regex = /([^&=]+)=([^&]*)/g, m;
while (m = regex.exec(fragmentString)) {
  params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
}
if (Object.keys(params).length > 0) {
  localStorage.setItem('oauth2-test-params', JSON.stringify(params) );
  if (params['state'] && params['state'] == 'try_sample_request') {
    
    // send token to background script
    browser.runtime.sendMessage({
        GoogleKMSaccessToken: "SAVE_TOKEN",
        access_token: params['access_token']
      })
  }
}


/*
 * Create form to request access token from Google's OAuth 2.0 server.
 */
function oauthSignIn() {
  // Google's OAuth 2.0 endpoint for requesting an access token
  var oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';

  // Create <form> element to submit parameters to OAuth 2.0 endpoint.
  var form = document.createElement('form');
  form.setAttribute('method', 'GET'); // Send as a GET request.
  form.setAttribute('action', oauth2Endpoint);

  // Parameters to pass to OAuth 2.0 endpoint.
  var params = {'client_id': _CLIENT_ID,
                'redirect_uri': _REDIRECT_URI,
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