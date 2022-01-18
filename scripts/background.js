"use strict";

const DPOP_ALG = "ES384";
var logedInInfo = "my_pass";
var _USER = "mmLab";
var _ORG = "AUEB";

browser.storage.local.set({userInfo: {username: _USER, org: _ORG}}, ()=>{})

browser.runtime.onInstalled.addListener(
    (details) => {
        if (details.reason == "update" || details.reason == "install") {
            generateKeys(logedInInfo)
        }
    }
)


async function awaitForPassword() {

    return new Promise((resolve, reject) => {
        let MAX_ITER = 10000;
        let handler = setInterval(()=>{
             if (logedInInfo) {
                 clearInterval(handler);
                 resolve("done")
             }
         }, 100);
    })
}

const main = async () => {
    // The name of the local storage acting as state for the
    // saved credentials
    const CREDENTIAL_STATE_NAME = "SavedCredentials";

    // Init the auds as a map between the audience and the VCs path in the FS. 
    // This will give O(1) lookup for auds
    const auds = {};
    const urlsToCheck = [];
    const cache = {};

    // Get the state
    let SavedCredentials = {}
    try{
        SavedCredentials = await readLocalStorage(CREDENTIAL_STATE_NAME);

        for (const el of SavedCredentials){
            if ((auds[el.aud] == undefined) && (!(el.payload == undefined))){
                auds[el.aud] = el.payload;
                urlsToCheck.push(formatAudUrl(el.aud));
            }
        }
    } catch(err){
        console.log("Error whily trying to read the state", err)
    }


    /**
     * Listen on messages
     */
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("REQUEST: ", request)
        sendResponse("OK")

        // read the password
        if (request.logedInInfo.password) {
        if(!logedInInfo) {
            logedInInfo = request.logedInInfo.password;
            }
        //logedInInfo = request.logedInInfo.password;
        }

        // save the user info
        if (request.logedInInfo.username && request.logedInInfo.org) {
        browser.storage.local.set({userInfo:{
            username: request.logedInInfo.username,
            org: request.logedInInfo.org
        }}, ()=>{})
        }
    })


    /**
     * the callback for the request listener as a named function
     * (used also to remove the listener)
     */
    var created = false;
    async function reqListenerCallback (e) {
        console.log("on onBeforeSendHeaders, e = ", e)
        
        // check if the request is for a protected resource for which 
        // there is a saved vc.
        const audience = hasCredential(auds, e.url)
        if (audience) {
            if (cache[audience] == undefined) {
                // Ask for permision from the user
                // TODO: break if user presses cancel
                //alert(e.url + " Reqests a Credential");
            }
            const credential = auds[audience];

            // Add the auth header
            e.requestHeaders.push({name: "authorization", value: "Bearer " + credential});

            cache[audience] = credential

            if(!(logedInInfo) && !created) {
                var w = 366;
                var h = 240;
                browser.windows.create({
                    url: "../html/login-popup.html", 
                    type: "popup",
                    width: w,
                    height: h,
                    left: (screen.width/2)-(w/2),
                    top: (screen.height/2)-(h/2)
                });
                created = true;

                const _res = await awaitForPassword();
                //TODO: What if the user closes the popup without supling a password
            }

            const keys = await browser.storage.local.get(["pubKey", "wrapedKey"]);
            const pubKey = keys.pubKey;
            const wrapedKey = keys.wrapedKey;

            //  dpop creation
            //      1. JWT header
            const dpop_header = {
                "typ":"dpop+jwt",
                "alg": DPOP_ALG,
                "jwk": {
                    "kty": pubKey.kty,
                    "x": pubKey.x,
                    "y": pubKey.y,
                    "crv": pubKey.crv
                }
            };
            
            //      2. JWT payload
            const dpop_payload = {
                "jti": self.crypto.randomUUID(),
                "htm": e.method,
                "htu": audience,
                "iat": Date.now()
            };

            //      3. dpop token without the signature
            const encodedHeader = jsonToBase64url(dpop_header);
            const encodedPayload = jsonToBase64url(dpop_payload);
            var dpop_token = encodedHeader + "." + encodedPayload;

            //      4. create jws and add dpop header
            const encoder = new TextEncoder()
            const dpop_token_encoded = encoder.encode(dpop_token)


            const signature = await window.crypto.subtle.sign(
                                        {
                                        name: "ECDSA",
                                        hash: {name: "SHA-384"},
                                        },
                                        await unWrapCryptoKey(
                                            bytesToArrayBuffer(JSON.parse(wrapedKey)),
                                            logedInInfo),
                                        dpop_token_encoded
                                    )

            const signature_encoded = arrayBufferToBase64url(signature);
            const dpop_jwt = dpop_token + "." + signature_encoded;
            // add dpop header
            e.requestHeaders.push({name: "dpop", value: dpop_jwt})
            }
    
        return new Promise((resolve, reject) => {resolve({requestHeaders: e.requestHeaders})});
    }


    /**
     *  Add a HTTP request event listener
     */
    function addRequestListener(auds, urlsToCheck, cache) {
        //HTTP GET Request event listener
        browser.webRequest.onBeforeSendHeaders.addListener(
            reqListenerCallback,
            {
                // only listen for the protected resources that there is a vc with that audience
                urls: urlsToCheck
            },
            ["blocking", "requestHeaders"]
        )
    }

    if (urlsToCheck.length > 0) {
        addRequestListener(auds, urlsToCheck, cache);
    }

    // Update the state when needed (i.e., when a new vc is saved)
    browser.storage.onChanged.addListener((changes, nameSpace) => {
        console.log("State Changes: ", changes)
        //auds = {}
        for (const [key, {newValue, oldValue}] of Object.entries(changes)) {
            if ((key == CREDENTIAL_STATE_NAME) && (nameSpace == "local") && (newValue)) {
                for (const el of newValue){
                    auds[el.aud] = el.payload
                    urlsToCheck.push(formatAudUrl(el.aud))
                    // remove the onBeforeSendHeaders listener and re-add him with
                    // the new filtering rules (urlsToCheck) and audiences (auds)
                    try{
                        browser.webRequest.onBeforeSendHeaders.removeListener(reqListenerCallback);
                    } catch(e) {console.log("in background.js, on browser.storage.onChanged, error = ", e)}
                    console.log("Add new listener with urlsToChack: ", urlsToCheck)
                    addRequestListener(auds, urlsToCheck, cache)
                }
            }
        }
    })
}

main();

/**
 * Create a key pair on update (for debuging, will 
 * be on install normally)
 */
// browser.runtime.onInstalled.addListener(
//     (details) => {
//         if (details.reason == "update" || details.reason == "install") {
//             // open a login popup the first time the
//             // user opens the extension
//             browser.browserAction.setPopup(
//                 {popup: "../html/signin-popup.html"},
//                 ()=>{}
//               )
//         }
//     }
// )