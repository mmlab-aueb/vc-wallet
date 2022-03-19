"use strict";

const DPOP_ALG = "ES384";
var logedInInfo = "my_pass";
var _USER = "mmLab";
var _ORG = "AUEB";

browser.storage.local.set({userInfo: {username: _USER, org: _ORG}}, ()=>{})

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

    // Get the state
    let SavedCredentials = {}
    try{
        SavedCredentials = await readLocalStorage(CREDENTIAL_STATE_NAME);
        console.log("SavedCredentials = ", SavedCredentials)

        for (const el of Object.values(SavedCredentials)){
            const savedVc = JSON.parse(el);
            if  (!(savedVc.vcJwt == undefined)) {

                const _vc = {vcJwt: savedVc.vcJwt, keys: savedVc.keys}
                auds, urlsToCheck = updateAuds(auds, urlsToCheck, savedVc.aud, _vc)
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
     * @param {*} e the request event
     * @returns Promise resolving with the request headers
     */
    async function reqListenerCallback (e) {
        console.log("on onBeforeSendHeaders, auds = ", auds)
    
        // Remove the port from the url
        const urlWithoutPort = /\:[0-9]{4}/.test(e.url) ? e.url.replace(/\:[0-9]{4}/, '') : e.url

        // check if the request is for a protected resource for which 
        // there is a saved vc.
        const audience = hasCredential(auds,  e.url)

        if (audience) {
            const credentials = auds[audience];
            
            // TODO: How to choose which credential with the same aud to send??
            const credential = credentials[0]

            // Add the auth header
            if (credential) {
                e.requestHeaders.push({name: "authorization", 
                                       value: "Bearer " + credential.vcJwt});
            }

            // Get the keys with which to create the dpop
            const keys = credential.keys;
            const pubKey = keys.pubKey;
            const wrapedKey = keys.wrapedKey;

             // Get the dpop
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
        console.log("Injected request headers = ", headers)
    
        return new Promise((resolve, reject) => {resolve({requestHeaders: headers})});
    }


    /**
     * Add a HTTP request event listener
     * @param {*} auds audiences to vc's map
     * @param {*} urlsToCheck target urls to listen for requests
     */
    function addRequestListener(auds, urlsToCheck) {
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
        addRequestListener(auds, urlsToCheck);
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
                    for (const el of Object.values(newValue)){
                        const savedVc = JSON.parse(el);
                        if (savedVc.vcJwt != undefined){
                            const _vc = {vcJwt: savedVc.vcJwt, keys: savedVc.keys}
                            auds, urlsToCheck = updateAuds(auds, urlsToCheck, savedVc.aud, _vc)
                        }
                    }
                }

                // remove the onBeforeSendHeaders listener and re-add him with
                // the new filtering rules (urlsToCheck) and audiences (auds)
                try{
                    browser.webRequest.onBeforeSendHeaders.removeListener(reqListenerCallback);
                } catch(e) {console.log("in background.js, on browser.storage.onChanged, error = ", e)}

                if (urlsToCheck.length > 0) {
                    addRequestListener(auds, urlsToCheck);
                }
            }
        }
    })
}

main();
