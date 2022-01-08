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
    const urlsToCeck = [];
    const cache = {};

    // Get the state
    let SavedCredentials = {}
    try{
        SavedCredentials = await readLocalStorage(CREDENTIAL_STATE_NAME);
        console.log("In main, SavedCredentials = ", SavedCredentials);

        for (el of SavedCredentials){
            if ((auds[el.aud] == undefined) && (!(el.payload == undefined))){
                auds[el.aud] = el.payload;
                urlsToCeck.push(formatAudUrl(el.aud));
                console.log("in main, urlsToCeck = ", urlsToCeck)
            }
        }
    } catch(err){
        console.log("Error whily trying to read the state", err)
    }

    console.log("In main, auds = ", auds);

    // Update the state when needed (i.e., when a new vc is saved)
    chrome.storage.onChanged.addListener((changes, nameSpace) => {
        console.log("State Updated, changes = ", changes, " in name space = ", nameSpace)

        for ([key, {newValue, oldValue}] of Object.entries(changes)) {
            if ((key == CREDENTIAL_STATE_NAME) && (nameSpace == "local") && (newValue)) {
                for (el of newValue){
                    auds[el.aud] = el.payload
                    urlsToCeck.push(formatAudUrl(el.aud))
                    console.log("in main, urlsToCeck = ", urlsToCeck)
                }
            }
        }
    })

    //HTTP GET Request event listener
    chrome.webRequest.onBeforeSendHeaders.addListener(
        (e) => {
            console.log("onBeforeSendHeaders: e = ", e);
            console.log("onBeforeSendHeaders, urlsToCeck = ", urlsToCeck)
            
            // check if the request is for a protected resource for which 
            // there is a saved vc.
            const audience = hasCredential(auds, e.url)
            console.log("onBeforeSendHeaders: audience = ", audience);
            if (audience) {
                if (cache[audience] == undefined) {
                    // Add the headers
                    alert(e.url + " Reqests a Credential");
                }

                try{
                    const credential = auds[audience];
                    console.log("in onBeforeSendHeaders, credential = ", credential);

                    // Add the headers
                    e.requestHeaders.push({name: "authorization", value: "Bearer " + credential})
                    e.requestHeaders.push({name: "dpop", value: "dpop_test_value"})

                    cache[audience] = credential

                }catch(e){
                    alert(e);
                }
            }

            return {requestHeaders: e.requestHeaders};
        },
        {
            // only listen for the protected resources that there is a vc with that audience
            urls: urlsToCeck
        },
        ["blocking", "requestHeaders", "extraHeaders"]
    )

    chrome.webRequest.handlerBehaviorChanged(()=>{console.log("Chach cleared??")})
}

main();
