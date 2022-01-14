/*
Get some key material to use as input to the deriveKey method.
The key material is a password supplied by the user.
*/
function getKeyMaterial() {
    //TODO: read the password on install of the extension
    const password = "my_password";
    const enc = new TextEncoder();
    return window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      {name: "PBKDF2"},
      false,
      ["deriveBits", "deriveKey"]
    );
}


/*
Given some key material and some random salt
derive an AES-KW key using PBKDF2.
*/
function getKey(keyMaterial, salt) {
    return window.crypto.subtle.deriveKey(
      {
        "name": "PBKDF2",
        salt: salt,
        "iterations": 100000,
        "hash": "SHA-256"
      },
      keyMaterial,
      { "name": "AES-GCM", "length": 256},
      true,
      [ "wrapKey", "unwrapKey" ]
    );
}


/**
* Wrap the given key.
*/
async function wrapCryptoKey(keyToWrap) {
    // get the key encryption key
    const keyMaterial = await getKeyMaterial();
    salt = window.crypto.getRandomValues(new Uint8Array(16));
    const wrappingKey = await getKey(keyMaterial, salt);
    iv = window.crypto.getRandomValues(new Uint8Array(12));

    // store salt and iv
    chrome.storage.local.set({wrapMaterial: {
        salt: JSON.stringify(Array.from(salt)),
        iv: JSON.stringify(Array.from(iv))
       }
    }, () => {console.log("Saved wrapMaterial")})
  
    return window.crypto.subtle.wrapKey(
      "jwk",
      keyToWrap,
      wrappingKey,
      {
        name: "AES-GCM",
        iv: iv
      }
    );
}


/**
 * Get the private key from the wraoed key
 */
async function unWrapCryptoKey(wrapedKey) {
    const wrapMaterial = await readLocalStorage("wrapMaterial")
    const salt = bytesToArrayBuffer(JSON.parse(wrapMaterial.salt))
    const iv = bytesToArrayBuffer(JSON.parse(wrapMaterial.iv))

    const keyMaterial = await getKeyMaterial();
    const wrappingKey = await getKey(keyMaterial, salt);

    return window.crypto.subtle.unwrapKey(
        "jwk",
        wrapedKey,
        wrappingKey,
        {
            name: "AES-GCM",
            iv: iv
        },
        {
            name: "ECDSA",
            namedCurve: "P-384"
        },
        true,
        ["sign"]
    )
}