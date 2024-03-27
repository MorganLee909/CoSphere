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

const activateWebsocket = ()=>{
    socket = new WebSocket(`ws://localhost:8000`);
    socket.addEventListener("open", ()=>{
        let data = {
            token: localStorage.getItem("coworkToken"),
            action: "status"
        };
        socket.send(JSON.stringify(data));

        data.location = locationData ? locationData._id : user.defaultLocation;
        data.action = "getLocation";
        socket.send(JSON.stringify(data));
    });

    socket.addEventListener("message", (event)=>{
        let data = JSON.parse(event.data);

        switch(data.action){
            case "status":
                document.getElementById("extraConnection").style.display = "flex";
                document.getElementById("container").style.display = "none";
                document.querySelector("header .headerRight").style.display = "none";
                socket.close(3001);
                break;
            case "participantJoined":
                homePage.updateTables(data.location.tables);
                locationData = data.location;
                break;
            case "participantLeft":
                homePage.updateTables(data.location.tables);
                locationData = data.location;
                break;
            case "getLocation":
                let tables = locationData ? locationData.tables : [];
                homePage.updateTables(data.location.tables);
                locationData = data.location;
                document.getElementById("locationSelect").value = locationData._id;
                document.getElementById("locationTitle").textContent = locationData.name;
                break;
            case "changeLocation":
                locationData = data.location;
                homePage.updateTables(locationData.tables);
                document.getElementById("locationTitle").textContent = locationData.name;
                break;
            case "updateIcon":
                homePage.updateIcon(data.user, data.name, data.avatar);
                break;
        }
    });
}

const getUser = ()=>{
    fetch("/user", {
        method: "get",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("coworkToken")}`
        }
    })
        .then(r=>r.json())
        .then((user)=>{
            if(user.error){
                requestError(user.message);
            }else{
                window.user = user;
                activateWebsocket();
            }
        })
        .catch((err)=>{
            requestError(err.message);
        });
}

if(isMobile()){
    document.getElementById("container").style.display = "none";
    document.getElementById("mobileContainer").style.display = "flex";
    document.querySelector(".headerRight").style.display = "none";
}else{
    homePage.render();
    getUser();
}
