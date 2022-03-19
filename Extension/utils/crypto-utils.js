/*
Get some key material to use as input to the deriveKey method.
The key material is a password supplied by the user.
*/
function getKeyMaterial(password) {
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
async function wrapCryptoKey(keyToWrap, JwkPubKey, password) {
  // get the key encryption key
  const keyMaterial = await getKeyMaterial(password);
  salt = window.crypto.getRandomValues(new Uint8Array(16));
  const wrappingKey = await getKey(keyMaterial, salt);
  iv = window.crypto.getRandomValues(new Uint8Array(12));

  const JwkPubKeyStr = JSON.stringify(JwkPubKey)

  // store salt and iv
  const storage_key = JwkPubKeyStr;
  
  const to_save = {}
  to_save[storage_key] = {wrapMaterial: {
    salt: JSON.stringify(Array.from(salt)),
    iv: JSON.stringify(Array.from(iv))
    }}
  
  await browser.storage.local.set(to_save)

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
async function unWrapCryptoKey(wrapedKey, JwkPubKey, password) {
  const JwkPubKeyStr = JSON.stringify(JwkPubKey)

  const storage_key = JwkPubKeyStr;
  const PubKeyWrapMaterial = await readLocalStorage(storage_key)

  const salt = bytesToArrayBuffer(JSON.parse(PubKeyWrapMaterial.wrapMaterial.salt))
  const iv = bytesToArrayBuffer(JSON.parse(PubKeyWrapMaterial.wrapMaterial.iv))

  const keyMaterial = await getKeyMaterial(password);
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


//{SavedCredentials: [{vc:..., pubKey:..., wrappedKey:...},...]}


async function generateKeys(pass) {
  const keyPair = await window.crypto.subtle.generateKey({
      name: "ECDSA",
      namedCurve: "P-384"
    },
    true,
    ["sign", "verify"]
  )

  const jwkPubKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const wrapedKey = await wrapCryptoKey(keyPair.privateKey, jwkPubKey, pass);

  //return [jwkPromise, wrapPromise]
  return new Promise((resolve, reject) => {resolve([jwkPubKey, wrapedKey])})
}
