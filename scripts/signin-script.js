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
        logedInInfo: {username: user, org: org}},
        (responce)=>{});

    generateKeys(pass)
})