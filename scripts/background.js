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
 * Get the credential from the local file system
 */
 async function fetchLocalResource(url) {
    return new Promise(
        function (resolve, reject) {
            const req = new XMLHttpRequest();

            req.onreadystatechange = function() {
                if (req.readyState === 4) {
                  console.log(req.response);
                  chrome.storage.local.set({"LoadedCredentials": req.response})
                  window.userCred =  req.response;
                  resolve(req.response)
                }
            };

            req.onerror = function () {
                reject({status: this.status,
                        statusText: req.statusText})
            }

            req.open('GET', url);
            req.send();
        }
    )
}


const main = async () => {
    // The name of the local storage acting as state for the
    // saved credentials
    const CREDENTIAL_STATE_NAME = "SavedCredentials"

    // Init the auds as a map between the audience and the VCs path in the FS. 
    // This will give O(1) lookup for auds
    const auds = {} 

    // Get the state
    // NOTE: This solution does not yet take in consideration the case where 
    //       the Holder has multiple credentials for the same audience.
    let SavedCredentials = {}
    try{
        SavedCredentials = await readLocalStorage(CREDENTIAL_STATE_NAME);
        console.log("In main, SavedCredentials = ", SavedCredentials);

        for (el of SavedCredentials){
            if ((auds[el.aud] == undefined) && (!(el.filePath == undefined))){
                // Get the vc
                try{
                    auds[el.aud] = el.filePath;
                } catch(error) {
                    alert("Error while trying to load credential from "+el.filePath)
                }
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
                    // Get the vc
                    try{
                        fetchLocalResource(el.filePath)
                        .then(res => {
                            auds[el.aud] = res
                        })
                        .catch(err => console.log(err))

                    } catch(error) {
                        alert("Error while trying to load credential from "+el.filePath)
                    }
                }
            }
        }
    })

    //HTTP GET Request event listener
    chrome.webRequest.onBeforeSendHeaders.addListener(
        (e) => {
            console.log("onBeforeSendHeaders: e = ", e);
            
            // check if the request is for a protected resource for which 
            // there is a saved vc.
            if (!(auds[e.url] == undefined)) {
                // Get the credential
                alert(e.url + " Reqests a Credential")
                const credential = {};

                fetchLocalResource(auds[e.url])
                .then(res => {
                    const jsonRes = JSON.parse(res)
                    console.log("in onBeforeSendHeaders after fetchLocal, res = ", jsonRes)
                    Object.assign(credential, {vc: jsonRes["vc"]})
                })

                console.log("in onBeforeSendHeaders, credential = ", credential);

                // Add the headers
                e.requestHeaders.push({name: "authorization", value: JSON.stringify(credential)})
                e.requestHeaders.push({name: "dpop", value: "dpop_test_value"})
            }

            return {requestHeaders: e.requestHeaders};
        },
        {
            // only listen for the protected resources that there is a vc with that audience
            urls: Object.keys(auds)
        },
        ["blocking", "requestHeaders", "extraHeaders"]
    )

}

main();
