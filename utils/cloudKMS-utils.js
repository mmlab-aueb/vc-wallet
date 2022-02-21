async function requestSignature(ToSignData, access_token){
    var api_endpoint = 'https://cloudkms.googleapis.com/v1/'
    var name = 'projects/aueb-ztvc/locations/global/keyRings/test_key_ring/cryptoKeys/test_key/cryptoKeyVersions/1';
    var API_KEY = 'AIzaSyBSdER1XE7nahA__wFsR8MW92bevaCyKKU'
    // var params = JSON.parse(localStorage.getItem('oauth2-test-params'));
    
    const _body = {
        digest: {
            "sha256": ToSignData
        }
    }

    // const _body = {
    //     data: ToSignData
    // }

    const _bodyStr = JSON.stringify(_body)
    console.log("_bodyStr = ", _bodyStr)

    const _postConf = {
        //credentials: 'include',
        headers: {
            Authorization: 'Bearer '+access_token,
            'Content-Type': 'application/json',
            'Accept': 'application/json'        
            },
        body: _bodyStr,
        // body:'{"digest": {"sha256": "' + data + '"}}',
        // body:'{"data": "' + data + '"}',
        method: 'POST'}

    return fetch(api_endpoint+name+':asymmetricSign' + '?key='+API_KEY, _postConf)
    .then((res) => {
        console.log("FETCH RESULT = ", res)
        if (res.status == 401) {
            // oauthSignIn()
            alert("You must log-in to Google KMS first")
        }
        return res.body
    })
    .then((body) => {
        console.log("RESULT BODY = ", body)
        
        //Read the response stream
        const reader = body.getReader()
        
        return new ReadableStream({
            start(controller) {
                
                function push() {
                    reader.read().then(({done, value}) => {
                        if (done) {
                            controller.close()
                            return;
                        }
                        
                        controller.enqueue(value);
                        push();
                    })
                }
                
                push();
            }
        })
    })
    .then((stream) => {
        return new Response(stream, { headers: { "Content-Type": "text/html" } }).text();
    })
}