/**
 * bytes array to ArrayBuffer
 */
function bytesToArrayBuffer(bytes) {
    const bytesAsArrayBuffer = new ArrayBuffer(bytes.length);
    const bytesUint8 = new Uint8Array(bytesAsArrayBuffer);
    bytesUint8.set(bytes);
    return bytesAsArrayBuffer;
}


/**
 * append "/*" to the end of a url only if
 * that url does not end with "/*"
 */
function formatAudUrl(url) {
    // Remove the port from the url
    const urlWithoutPort = /\:[0-9]{4}/.test(url) ? url.replace(/\:[0-9]{4}/, '') : url

    // Add "*://" if scheme is missing (TODO: Add https:// instead pf "*://*.")
    const url_start_formed = (/^http:\/\//.test(urlWithoutPort) || /^https:\/\//.test(urlWithoutPort)) ? 
                                urlWithoutPort : "*://*."+urlWithoutPort

    return /\/\*$/.test(url_start_formed) ? url_start_formed : (/\/$/.test(url_start_formed) ? 
                        url_start_formed + "*" : url_start_formed + "/*");
}


/**
 * JSON object object to Base64url encoding
 */
function jsonToBase64url(json_data) {
    return btoa(JSON.stringify(json_data))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
}


/**
 * ArrayBuffer object to Base64url encoding
 */
function arrayBufferToBase64url(array_buffer) {
    return btoa(Array.from(new Uint8Array(array_buffer),
            b => String.fromCharCode(b)).join(''))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
}


/**
 * check if there is a saved credential with an audience for
 * which the given url is a sub url
 */
 function hasCredential(auds, url) {
    for (const aud of Object.keys(auds)) {
        if (url.indexOf(aud) > -1) {
            return aud;
        }
    }
    return false;
}


/** 
 * Promisifie local storage reads
 */
 const readLocalStorage = async (key) => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], (res) => {
            if (res[key] === undefined) {
                reject("undefined key");
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