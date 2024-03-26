const homePage = require("./pages/home.js");
const deskPage = require("./pages/desk.js");
const officePage = require("./pages/office.js");

const pages = document.querySelectorAll(".page");

window.user = {};
window.socket = {};
window.locationData = null;

const isMobile = ()=>{
    const match = window.matchMedia("(pointer:coarse)");
    return match && match.matches;
}

changePage = (page, data)=>{
    for(let i = 0; i < pages.length; i++){
        pages[i].style.display = "none";
    }

    document.getElementById(`${page}Page`).style.display = "flex";

    switch(page){
        case "home": homePage.render(); break;
        case "desk": deskPage.render(); break;
        case "office": officePage.render(data); break;
    }
}

createBanner = (color, message)=>{
    let banner = document.getElementById("banner");

    banner.style.background = color;
    banner.style.display = "flex";
    banner.querySelector("p").textContent = message;

    setTimeout(()=>{
        banner.style.display = "none";
    }, 5000);
}

requestError = (message)=>{
    switch(message){
        case "payment": window.location.href = "/stripe/checkout"; break;
        case "token":
            localStorage.removeItem("coworkToken");
            window.location.href = "/user/login";
            break;
        case "Authorization":
            localStorage.removeItem("coworkToken");
            window.location.href = "/user/login";
            break;
        case "email":
            localStorage.removeItem("coworkToken");
            window.location.href = "/email/unconfirmed";
        default:
            createBanner("red", message);
    }
}

//BUTTONS
document.getElementById("deskBtn").addEventListener("click", ()=>{changePage("desk")});
document.getElementById("coworkingBtn").addEventListener("click", ()=>{changePage("home")});
document.getElementById("logoutBtn").addEventListener("click", ()=>{
    localStorage.removeItem("coworkToken");
    window.location.href = "/";
});

if(isMobile()){
    document.getElementById("container").style.display = "none";
    document.getElementById("mobileContainer").style.display = "flex";
    document.querySelector(".headerRight").style.display = "none";
}else{
    homePage.render();
}
