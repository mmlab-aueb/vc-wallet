document.getElementById("getImg_ptn").addEventListener("click", function(){

    const GetPhotoEndPoint = "http://127.0.0.1:3001/photos";

    const FetchImgConfig = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: "GET"
    };

    // Request a photo. Using nesting for beter error handling
    photoRequest(GetPhotoEndPoint, FetchImgConfig)
    
})



/***
 * function for requesting a photo, If the first request returns with a 401
 * the function will repeat the same request 
 * (where the wallet will insert the VC)
 */
async function photoRequest(endPoint, config) {

    fetch(endPoint, config)
    .then(res => {
        console.log("result status = ", res.status)
        return res.blob()})
    .then(resBlob => {
        const imgURL = URL.createObjectURL(resBlob);
        
        // display img
        const imgDisplay = document.getElementById("img_display");
        imgDisplay.setAttribute("src", imgURL)
        })
    .catch(error => alert(error));
}