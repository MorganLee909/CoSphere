module.exports = {
    rendered: false,
    tableTemplate: document.getElementById("tablesTemplate").content.children[0],
    meetingDiv: document.getElementById("meeting"),

    render: function(){
        if(!this.rendered){
            this.rendered = true;

            //Retrieve and build user/tables
            this.getUser();
            this.populateLocations();

            //Set video player frame controls
            document.getElementById("closeTag").addEventListener("click", ()=>{this.closeMeeting(this.meetingDiv)});
            document.getElementById("expandTag").addEventListener("click", this.fullScreen);
            this.dragElement(this.meetingDiv, document.getElementById("dragTag"));
        }
    },

    changeLocation: function(){
        this.closeMeeting(this.meetingDiv);
        socket.close(3001, "changeLocation");

        locationData._id = document.getElementById("locationSelect").value;
        this.activateWebsocket();
    },

    populateLocations: function(){
        fetch("/location", {
            method: "get",
            headers: {
                "Content-Type": "application/json"
            }
        })
            .then(r=>r.json())
            .then((response)=>{
                if(response.error){
                    createBanner("red", response.message);
                }else{
                    let locations = document.getElementById("locationSelect");

                    for(let i = 0; i < response.length; i++){
                        let option = document.createElement("option");
                        option.value = response[i]._id;
                        option.textContent = response[i].name;
                        locations.appendChild(option);
                    }
                }

                document.getElementById("locationSelect").addEventListener("change", this.changeLocation.bind(this));
            })
            .catch((err)=>{
                createBanner("red", "Server error");
            });
    }, 

    activateWebsocket: function(){
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
                    this.updateTables(data.location.tables);
                    locationData = data.location;
                    break;
                case "participantLeft":
                    this.updateTables(data.location.tables);
                    locationData = data.location;
                    break;
                case "getLocation":
                    let tables = locationData ? locationData.tables : [];
                    this.updateTables(data.location.tables);
                    this.showOffices(data.offices);
                    locationData = data.location;
                    document.getElementById("locationSelect").value = locationData._id;
                    document.getElementById("locationTitle").textContent = locationData.name;
                    break;
                case "updateIcon":
                    this.updateIcon(data.user, data.name, data.avatar);
                    break;
            }
        });

        socket.closeListener = socket.addEventListener("close", (event)=>{
            if(event.code !== 3001){
                setTimeout(()=>{
                    createBanner("red", "Disconnected from server, attempting to reconnect...");
                    this.activateWebsocket();
                }, 5000)
            }
        });
    },

    initIframeAPI: function(jwt, table){
        const options = {
            roomName: `vpaas-magic-cookie-05680c1c54f04789935526e7e06a717b/${table}`,
            jwt: jwt,
            height: "100%",
            width: "100%",
            parentNode: document.getElementById("meeting"),
            configOverwrite: {
                toolbarButtons: [
                    'camera',
                    'chat',
                    'closedcaptions',
                    'desktop',
                    'download',
                    'embedmeeting',
                    'etherpad',
                    'feedback',
                    'filmstrip',
                    'fullscreen',
                    'hangup',
                    'help',
                    'highlight',
                    'microphone',
                    'noisesuppression',
                    'participants-pane',
                    'profile',
                    'raisehand',
                    'recording',
                    'security',
                    'select-background',
                    'settings',
                    'shareaudio',
                    'sharedvideo',
                    'shortcuts',
                    'stats',
                    'tileview',
                    'toggle-camera',
                    'videoquality',
                    'whiteboard',
                ]
            }
        };

        api = new JitsiMeetExternalAPI("8x8.vc", options);
        api.addListener("videoConferenceLeft", (data)=>{this.closeMeeting(this.meetingDiv)});
    },

    tableFull: function(table){
        let seats = table.querySelectorAll(".occupant");
        let tableFull = true;
        for(let i = 0; i < seats.length; i++){
            if(!seats[i].id) return false;
        }
        return true;
    },

    joinTable: function(table){
        if(this.tableFull(table)){
            createBanner("red", "All seats are occupied at this table");
            return;
        }

        this.meetingDiv.style.display = "flex";

        let api = {};

        fetch("/location/table/join", {
            method: "post",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("coworkToken")}`
            },
            body: JSON.stringify({
                location: locationData.identifier,
                table: table.id
            })
        })
            .then(r=>r.json())
            .then((response)=>{
                if(response.error){
                    requestError(response.message);
                }else{
                    this.initIframeAPI(response, `${locationData.identifier}-${table.id}`);
                    document.getElementById("homeBlocker").style.display = "flex";
                    table.classList.add("joinedTable");
                }
            })
            .catch((err)=>{
                requestError(err.message);
            });
    },

    dragElement: function(moveElem, clickElem){
        let positions = [];
        
        const dragMouseDown = (e)=>{
            e = e || window.event;
            e.preventDefault();

            positions[2] = e.clientX;
            positions[3] = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        const elementDrag = (e)=>{
            e = e || window.event;
            e.preventDefault();

            positions[0] = positions[2] - e.clientX;
            positions[1] = positions[3] - e.clientY;
            positions[2] = e.clientX;
            positions[3] = e.clientY;

            moveElem.style.top = `${moveElem.offsetTop - positions[1]}px`;
            moveElem.style.left = `${moveElem.offsetLeft - positions[0]}px`;
        }

        const closeDragElement = ()=>{
            document.onmouseup = null;
            document.onmousemove = null;
        }

        clickElem.onmousedown = dragMouseDown;
    },

    closeMeeting: function(meetingDiv){
        let iframe = meetingDiv.querySelector("iframe");
        if(iframe) meetingDiv.removeChild(iframe);
        meetingDiv.style.display = "none";

        document.getElementById("homeBlocker").style.display = "none";
        let joinedTable = document.querySelector(".table.joinedTable");
        if(joinedTable) joinedTable.classList.remove("joinedTable");

        socket.send(JSON.stringify({
            action: "participantLeft",
            location: locationData._id,
            token: localStorage.getItem("coworkToken")
        }));
    },

    fullScreen: function(event){
        let fs = event.target.getAttribute("data-fs");
        let meetingDiv = document.getElementById("meeting");
        if(fs === "false"){
            meetingDiv.style.height = "100%";
            meetingDiv.style.width = "100%";
            meetingDiv.style.top = "0";
            meetingDiv.style.left = "0";
            event.target.setAttribute("data-fs", "true");
            event.target.parentElement.classList.add("fullscreen");
        }else{
            meetingDiv.style.height = "50%";
            meetingDiv.style.width = "50%";
            meetingDiv.style.top = "25%";
            meetingDiv.style.left = "25%";
            event.target.setAttribute("data-fs", "false");
            event.target.parentElement.classList.remove("fullscreen");
        }
    },

    getUser: function(){
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
                    this.activateWebsocket();
                }
            })
            .catch((err)=>{
                requestError(err.message);
            });
    },

    updateTables: function(newTables){
        for(let i = 0; i < newTables.length; i++){
            let table = document.getElementById(newTables[i]._id);
            if(!table) table = this.addTable(newTables[i]);

            let occupants = table.querySelectorAll(".occupant");
            for(let j = 0; j < newTables[i].occupants.length; j++){
                if(newTables[i].occupants[j].userId != occupants[j].getAttribute("userId")){
                    this.updateOccupant(newTables[i].occupants[j], occupants[j]);
                }
            }
        }

        let tables = document.querySelectorAll(".table");
        for(let i = 0; i < tables.length; i++){
            let match = newTables.find(t => t._id === tables[i].id);
            if(!match) tables[i].parentElement.removeChild(tables[i]);
        }
    },

    showOffices: function(offices){
        let template = document.getElementById("officeButton").content.children[0];
        let officeContainer = document.getElementById("offices");
        for(let i = 0; i < offices.length; i++){
            let office = template.cloneNode(true);
            office.id = offices[i]._id;
            office.querySelector(".officeName").textContent = offices[i].name;
            office.addEventListener("click", ()=>{changePage("office", offices[i]._id)});
            officeContainer.appendChild(office);
        }
    },

    addTable: function(newTable){
        let table = this.tableTemplate.cloneNode(true);
        table.id = newTable._id;
        table.addEventListener("click", ()=>{
            this.joinTable(table);
        });
        document.getElementById("tables").appendChild(table);
        return table;
    },

    updateOccupant: function(occupant, seat){
        if(!occupant.userId){
            seat.removeAttribute("userId");
            seat.classList.remove("noBorder");
            seat.classList.remove("goldBorder");
            seat.querySelector("p").textContent = "";
            seat.removeChild(seat.querySelector("img"));
        }else{
            seat.setAttribute("userId", occupant.userId);
            seat.classList.add("noBorder");
            seat.querySelector("p").textContent = occupant.name;
            if(occupant.userId === "65f9d62c1dea3702d2744c09") seat.classList.add("goldBorder");
            
            let image = document.createElement("img");
            image.src = occupant.avatar;
            seat.appendChild(image);
        }
    },

    updateIcon: function(user, name, avatar){
        let tables = locationData.tables;

        for(let i = 0; i < tables.length; i++){
            let found = false;
            for(let j = 0; j < tables[i].occupants.length; j++){
                if(user === tables[i].occupants[j].userId){
                    tables[i].occupants[j].name = name;
                    tables[i].occupants[j].avatar = avatar;
                    found = true;
                    break;
                }
            }
            if(found) break;
        }

        let icon = document.querySelector(`[data-user="${user}"]`);
        icon.querySelector("p").textContent = name;
        icon.querySelector("img").src = avatar;
    }
}
