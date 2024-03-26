module.exports = {
    rendered: false,

    render: function(officeId){
        if(!rendered){
            this.getOffice(officeId);

            this.rendered = true;
        }
    },

    getOffice: function(id){
        let data = {
            action: "getOffice",
            user: localStorage.getItem("coworkToken"),
            office: id
        };

        socket.send(data);
    }
}
