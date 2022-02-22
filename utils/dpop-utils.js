/**
 * Create a dpop value using the cypto.subtle API
 * 
 * @param {*} pubKey pubKey for the dpop
 * @param {*} requestEvent the HTTP request in wich to add the dpop value
 * @param {*} audience the URL of the dpop recepient
 */
async function dpop(pubKey, wrapedKey, method, audience, dpop_alg, logedInInfo) {
    //  dpop creation
    //      1. JWT header
    const dpop_header = {
        "typ":"dpop+jwt",
        "alg": dpop_alg,
        "jwk": {
            "kty": pubKey.kty,
            "x": pubKey.x,
            "y": pubKey.y,
            "crv": pubKey.crv
        }
    };
    
    //      2. JWT payload
    const dpop_payload = {
        "jti": window.crypto.randomUUID(), // self.crypto.randomUUID()
        "htm": method,
        "htu": audience,
        "iat": Date.now()
    };

    //      3. dpop token without the signature
    const encodedHeader = jsonToBase64url(dpop_header);
    const encodedPayload = jsonToBase64url(dpop_payload);
    var dpop_token = encodedHeader + "." + encodedPayload;

    //      4. create jws and add dpop header
    const encoder = new TextEncoder()
    const dpop_token_encoded = encoder.encode(dpop_token)

    const signature = await window.crypto.subtle.sign(
                                {
                                name: "ECDSA",
                                hash: {name: "SHA-384"},
                                },
                                await unWrapCryptoKey(
                                    bytesToArrayBuffer( 
                                        JSON.parse(wrapedKey)
                                    ),
                                    pubKey,
                                    logedInInfo),
                                dpop_token_encoded
                            )

    const signature_encoded = arrayBufferToBase64url(signature);
    return dpop_token + "." + signature_encoded;   
}