/** 
 * Promisifie local storage reads
 */
const readLocalStorage = async (key) => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], (res) => {
            if (res[key] === undefined) {
                reject();
            } else {
                resolve(res[key]);
        }});
    });
};


/**
 * Synchronously get the credential from the local file system
 */
function fetchLocalResourceSync(url) {
    const req = new XMLHttpRequest();

    req.open('GET', url, false);

    req.send(null);

    console.log("in fetchLocalResourceSync, req = ", req)

    if (req.readyState == 4) {
        return req.responseText
    } else {
        throw Error("Cant load credential from " + url)
        return null
    }
}

/**
 * check if there is a saved credential with an audience for
 * which the given url is a sub url
 */
function hasCredential(auds, url) {
    for (aud of Object.keys(auds)) {
        if (url.indexOf(aud) > -1) {
            return aud;
        }
    }
    return false;
}

function formatAudUrl(url) {
    return /\/\*$/.test(url) ? url : (/\/$/.test(url) ? url + "*" : url + "/*");
}



const main = async () => {
    // The name of the local storage acting as state for the
    // saved credentials
    const CREDENTIAL_STATE_NAME = "SavedCredentials"

    // Init the auds as a map between the audience and the VCs path in the FS. 
    // This will give O(1) lookup for auds
    const auds = {};
    const urlsToCheck = [];
    const cache = {};

    // Get the state
    let SavedCredentials = {}
    try{
        SavedCredentials = await readLocalStorage(CREDENTIAL_STATE_NAME);
        console.log("In main, SavedCredentials = ", SavedCredentials);

        for (el of SavedCredentials){
            if ((auds[el.aud] == undefined) && (!(el.payload == undefined))){
                auds[el.aud] = el.payload;
                urlsToCheck.push(formatAudUrl(el.aud));
                console.log("in main, urlsToCheck = ", urlsToCheck)
            }
        }
    } catch(err){
        console.log("Error whily trying to read the state", err)
    }

    console.log("In main, auds = ", auds);

    /**
     * the callback for the request listener as a named function
     * (used also to remove the listener)
     */
    function reqListenerCallback (e) {
        console.log("onBeforeSendHeaders: e = ", e);
        console.log("onBeforeSendHeaders, urlsToCheck = ", urlsToCheck)
        
        // check if the request is for a protected resource for which 
        // there is a saved vc.
        const audience = hasCredential(auds, e.url)
        console.log("onBeforeSendHeaders: audience = ", audience);
        if (audience) {
            if (cache[audience] == undefined) {
                // Ask for permision from the user
                // TODO: break if user presses cancel
                alert(e.url + " Reqests a Credential");
            }
            const credential = auds[audience];
            console.log("in onBeforeSendHeaders, credential = ", credential);

            // Add the headers
            e.requestHeaders.push({name: "authorization", value: "Bearer " + credential})
            e.requestHeaders.push({name: "dpop", value: "dpop_test_value"})

            cache[audience] = credential
        }
    
        return {requestHeaders: e.requestHeaders};
    }

    /**
     *  Add a HTTP request event listener
     */
    function addRequestListener(auds, urlsToCheck, cache) {
        //HTTP GET Request event listener
        chrome.webRequest.onBeforeSendHeaders.addListener(
            reqListenerCallback,
            {
                // only listen for the protected resources that there is a vc with that audience
                urls: urlsToCheck
            },
            ["blocking", "requestHeaders", "extraHeaders"]
        )
    }

    addRequestListener(auds, urlsToCheck, cache);

    // Update the state when needed (i.e., when a new vc is saved)
    chrome.storage.onChanged.addListener((changes, nameSpace) => {
        console.log("State Updated, changes = ", changes, " in name space = ", nameSpace)

        for ([key, {newValue, oldValue}] of Object.entries(changes)) {
            if ((key == CREDENTIAL_STATE_NAME) && (nameSpace == "local") && (newValue)) {
                for (el of newValue){
                    auds[el.aud] = el.payload
                    urlsToCheck.push(formatAudUrl(el.aud))
                    console.log("in main, urlsToCheck = ", urlsToCheck)
                    // remove the onBeforeSendHeaders listener and re-add him with
                    // the new filtering rules (urlsToCheck) and audiences (auds)
                    chrome.webRequest.onBeforeSendHeaders.removeListener(reqListenerCallback);
                    addRequestListener(auds, urlsToCheck, cache)
                }
            }
        }
    })

    chrome.webRequest.handlerBehaviorChanged(()=>{console.log("Chach cleared??")})
}

main();
