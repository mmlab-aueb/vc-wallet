"use strict";

const DPOP_ALG = "ES384";
var logedInInfo = "my_pass";
var _USER = "mmLab";
var _ORG = "AUEB";

browser.storage.local.set({userInfo: {username: _USER, org: _ORG}}, ()=>{})

// browser.runtime.onInstalled.addListener(
//     (details) => {
//         if (details.reason == "update" || details.reason == "install") {
            
//             const keys = generateKeys(logedInInfo)

//             keys.then(([pk_jwk, wraped_key]) => {
//                 const wrapedKey_data = JSON.stringify(Array.from(new Uint8Array(wraped_key)));
//                 browser.storage.local.set({keys: {pubKey: pk_jwk, wrapedKey: wrapedKey_data}})
//                 }

//             ).catch((e)=>{console.log("Error in creating client keys: ", e)})
//         }
//     }
// )


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
    var auds = {};
    var urlsToCheck = [];
    const cache = {};

    // Get the state
    let SavedCredentials = {}
    try{
        SavedCredentials = await readLocalStorage(CREDENTIAL_STATE_NAME);
        console.log("SavedCredentials = ", SavedCredentials)

        for (const el of SavedCredentials){
            if  (!(el.vcJwt == undefined)) {

                const _vc = {vcJwt: el.vcJwt, keys: el.keys}
                auds, urlsToCheck = updateAuds(auds, urlsToCheck, el.aud, _vc)
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
        console.log("on onBeforeSendHeaders, auds = ", auds)
    
        // Remove the port from the url
        const urlWithoutPort = /\:[0-9]{4}/.test(e.url) ? e.url.replace(/\:[0-9]{4}/, '') : e.url

        // check if the request is for a protected resource for which 
        // there is a saved vc.
        const audience = hasCredential(auds,  e.url)
 
        console.log(" ---> audience = ", audience)

        if (audience) {
            // if (cache[audience] == undefined) {
                // Ask for permision from the user
                // TODO: break if user presses cancel
                //alert(e.url + " Reqests a Credential");
            // }
            const credentials = auds[audience];
            
            // TODO: How to choose what credential from the list to send??
            const credential = credentials[0]
            console.log("on onBeforeSendHeaders, credentials = ", credentials)
            console.log("on onBeforeSendHeaders, credential = ", credential)
            console.log("on onBeforeSendHeaders, credential.vcJwt = ", credential.vcJwt)

            // Add the auth header
            if (credential) {
                e.requestHeaders.push({name: "authorization", 
                                       value: "Bearer " + credential.vcJwt});
            }

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

                //const _res = await awaitForPassword();
                //TODO: What if the user closes the popup without supling a password
            }

            const keys = credential.keys;
            const pubKey = keys.pubKey;
            const wrapedKey = keys.wrapedKey;

            const dpop_jwt = await dpop(pubKey,
                 wrapedKey,
                 e.method, 
                 audience, 
                 DPOP_ALG,  
                 logedInInfo)

            // add dpop header
            e.requestHeaders.push({name: "dpop", value: dpop_jwt})
            }

        const headers = e.requestHeaders
        
        console.log("RETURNED e.requestHeaders = ", headers)
    
        return new Promise((resolve, reject) => {resolve({requestHeaders: headers})});
    }


    /**
     *  Add a HTTP request event listener
     */
    function addRequestListener(auds, urlsToCheck, cache) {
        console.log("urlsToCheck = ", urlsToCheck)
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
        console.log("ADDING HTTP REQUEST LISTENER")
        addRequestListener(auds, urlsToCheck, cache);
    }

    // Update the state when needed (i.e., when a new vc is saved)
    browser.storage.onChanged.addListener((changes, nameSpace) => {
        for (const [key, {newValue, oldValue}] of Object.entries(changes)) {
            if ((key == CREDENTIAL_STATE_NAME) && (nameSpace == "local")) {
                // The new value will be the whole list of credentials, which is
                // why we reset the auds and urlsToCheck states
                for (const key of Object.keys(auds)){
                    delete auds[key]
                }

                urlsToCheck = []

                if (newValue) {
                    for (const el of newValue){
                        const _vc = {vcJwt: el.vcJwt, keys: el.keys}
                        auds, urlsToCheck = updateAuds(auds, urlsToCheck, el.aud, _vc)
                    }
                }

                // remove the onBeforeSendHeaders listener and re-add him with
                // the new filtering rules (urlsToCheck) and audiences (auds)
                try{
                    browser.webRequest.onBeforeSendHeaders.removeListener(reqListenerCallback);
                } catch(e) {console.log("in background.js, on browser.storage.onChanged, error = ", e)}

                if (urlsToCheck.length > 0) {
                    addRequestListener(auds, urlsToCheck, cache);
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