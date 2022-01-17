document.getElementById("signin_form_id").addEventListener("submit", (event)=>{
    // create crypto keys for the holder. Save the 
    // pub key as a jwk and the encrypted private key.
    event.preventDefault();
    const pass = document.getElementById("password_input").value;
    const conf_pass = document.getElementById("conf_password_input").value;
    const user = document.getElementById("name_input").value;
    const org = document.getElementById("org_input").value;

    if (!(pass == conf_pass)) {
        alert("Your passwords need to match")
        return
    }
    
    browser.runtime.sendMessage({
        logedInInfo: {username: user, org: org}},  // , password: pass
        (responce)=>{});

    window.crypto.subtle.generateKey({
        name: "ECDSA",
        namedCurve: "P-384"
    },
    true,
    ["sign", "verify"]
    )
    .then((keyPair) => {
        window.crypto.subtle.exportKey("jwk", keyPair.publicKey)
        .then((pk_jwk) => {
            browser.storage.local.set({pubKey: pk_jwk})
        })
        // return {pubKey: keyPair.publicKey,
        //     wrapedKey: await wrapCryptoKey(keyPair.privateKey, pass)};
        console.log("private key = ", keyPair.privateKey)
        const wrapPromise = wrapCryptoKey(keyPair.privateKey, pass);

        wrapPromise.then((wraped_key) => {
                //console.log("pubKey = ", res.pubKey)
                // save the public key as a jwk
                const wrapedKey_data = JSON.stringify(Array.from(new Uint8Array(wraped_key)));
                browser.storage.local.set(
                    {wrapedKey: wrapedKey_data},
                    ()=>{
                        console.log( {wrapedKey: wrapedKey_data})
                        browser.browserAction.setPopup(
                            {popup: "../html/popup.html"},
                            ()=>{});
                        window.location.href = "../html/popup.html";
                    })
            }).catch((e)=>{alert(e)})
    });
})