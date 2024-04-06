const css = `
:host{
    display: flex;
    justify-content: space-around;
    align-items: center;
    flex-wrap: wrap;
    flex-grow: 3;
    height: 100%;
    width: 100%;
    position: relative;
}

#homeBlocker{
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    z-index: 2;
}
`;

//id = "location_ID"
//name = location name
//identifier = location identifier for Jitsi
//tables = list of tables/data (Object)
class Location extends HTMLElement{
    constructor(){
        super();
        this.tables = [];

        const template = document.createElement("template");
        template.innerHTML = `<style>${css}</style>`;
        this.shadow = this.attachShadow({mode: "open"});
        this.shadow.appendChild(template.content.cloneNode(true));
    }

    connectedCallback(){
        if(this.type === "office"){
            this.updateTables(this.tables);
        }else{
            this.getLocation();
        }
    }

    getLocation(){
        fetch(`/location/${this.id.split("_")[1]}`, {
            method: "get",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("coworkToken")}`
            }
        })
            .then(r=>r.json())
            .then((location)=>{
                if(location.error){
                    requestError(location.message);
                }else{
                    this.name = location.name;
                    this.identifier = location.identifier;
                    this.updateTables(location.tables);
                }
            })
            .catch((err)=>{
                requestError(err.message);
            });
    }

    updateTables(newTables){
        for(let i = 0; i < newTables.length; i++){
            let table = this.shadow.querySelector(`#table_${newTables[i]._id}`);
            if(!table){
                table = document.createElement("table-comp");
                table.setAttribute("id", `table_${newTables[i]._id}`);
                table.occupants = newTables[i].occupants;
                table.type = newTables[i].type;
                table.locationIdentifier = this.identifier;
                table.parentShadow = this.shadow;
                this.shadow.appendChild(table);
            }

            table.occupants = newTables[i].occupants;
            table.updateOccupants();
        }

        for(let i = 0; i < this.tables.length; i++){
            let match = newTables.find(t => t._id === this.tables[i]._id);
            if(!match) this.removeChild(document.getElementById(this.tables[i]._id));
        }

        this.tables = newTables;
    }

    updateIcon(tableId, userId, avatar, name){
        let table = this.shadow.querySelector(`#table_${tableId}`);
        table.updateIcon(userId, avatar, name);
    }

    destroy(){
        this.getRootNode().host.shadow.removeChild(this);
    }
}

customElements.define("location-comp", Location);