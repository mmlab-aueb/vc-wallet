document.getElementById("login_form_id").addEventListener("submit", (event)=>{
    event.preventDefault();
    const pass = document.getElementById("password_input").value;
    
    browser.runtime.sendMessage({
        logedInInfo: {password: pass}},
        (responce)=>{
            window.close();
        });
    }
)