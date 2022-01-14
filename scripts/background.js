const DPOP_ALG = "ES384";

/**
 * Create a key pair on update (for debuging, will 
 * be on install normally)
 */
chrome.runtime.onInstalled.addListener(
    (details) => {
        if (details.reason == "update") {
            // create crypto keys for the holder. Save the 
            // pub key as a jwk and the encrypted private key.
            window.crypto.subtle.generateKey({
                name: "ECDSA",
                namedCurve: "P-384"
            },
            true,
            ["sign", "verify"]
            )
            .then(async (keyPair) => {
                return {pubKey: keyPair.publicKey,
                    wrapedKey: await wrapCryptoKey(keyPair.privateKey)};
            })
            .then((res) => {
                console.log("pubKey = ", res.pubKey)
                // save the public key as a jwk
                window.crypto.subtle.exportKey("jwk", res.pubKey)
                .then((pk_jwk) => {
                    // encode the wrapedKey as json and save it
                    const wrapedKey_data = JSON.stringify(Array.from(new Uint8Array(res.wrapedKey)));
                    chrome.storage.local.set(
                        {keysMaterial:
                            {publicKey: pk_jwk,
                            wrapedKey: wrapedKey_data}
                        },
                        ()=>{console.log("Saved Key: ", {publicKey: pk_jwk, wrapedKey: wrapedKey_data})})
                });
            });
        }
})


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
        console.log("Error whily trying to read the state", err)}


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

            // Add the auth header
            e.requestHeaders.push({name: "authorization", value: "Bearer " + credential})

            cache[audience] = credential

            // Get the key with witch to create the DPoP
            chrome.storage.local.get(["keysMaterial"], (res)=>{
                // TODO: Check if the pubKey is correct
                unWrapCryptoKey(
                    bytesToArrayBuffer(
                        JSON.parse(res.keysMaterial.wrapedKey)
                        )
                ).then(
                    (privateKey) => {
                        // jose to sign
                        //      1. JWT header
                        const pubKey = res.keysMaterial.publicKey;
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
                            "htu":"https://server.example.com/token",
                            "iat":Date.now()
                        };

                        //      3. dpop token without the signature
                        const encodedHeader = jsonToBase64url(dpop_header);
                        const encodedPayload = jsonToBase64url(dpop_payload);
                        var dpop_token = encodedHeader + "." + encodedPayload;

                        //      4. sign token and create jwt
                        const encoder = new TextEncoder()
                        const dpop_token_encoded = encoder.encode(dpop_token)
                        window.crypto.subtle.sign(
                            {
                            name: "ECDSA",
                            hash: {name: "SHA-384"},
                            },
                            privateKey,
                            dpop_token_encoded
                        ).then((signature) => {
                            // base64url encode the signature
                            const signature_encoded = arrayBufferToBase64url(signature);
                            const dpop_jwt = dpop_token + "." + signature_encoded;
                            console.log("in onBeforeSendHeaders, dpop = ", dpop_jwt);
                            e.requestHeaders.push({name: "dpop", value: dpop_jwt})
                        })
                    }
                )
            })
        }

        console.log("Request Headers = ", e.requestHeaders)
    
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
