const Location = require("../models/location.js");
const Office = require("../models/office.js");

const {joinTable} = require("./manageTables.js");

const jwt = require("jsonwebtoken");
const fs = require("fs");
const crypto = require("crypto");

module.exports = {
    /*
     * POST: create JWT for user to join a table
     * req.body = {
     *      location: String
     *      table: String Id
     * }
     * response: JWT
     */
    joinTable: function(req, res){
        let nbf = new Date();
        nbf.setDate(nbf.getDate() - 10);
        nbf = nbf.getTime();
        nbf = Math.floor(nbf / 1000);

        let exp = new Date();
        exp.setDate(exp.getDate() + 1);
        exp = exp.getTime();

        let options = {
            algorithm: "RS256",
            header: {
                kid: process.env.JAAS_API_KEY,
                alg: "RS256"
            }
        }

        let token = jwt.sign({
            aud: "jitsi",
            context: {
                user: {
                    id: res.locals.user._id,
                    name: res.locals.user.firstName,
                    email: res.locals.user.email,
                    moderator: false
                },
                features: {
                    livestreaming: false,
                    recording: false,
                    transcription: false,
                    "sip-inbound-call": false,
                    "sip-outbound-call": false,
                    "inbound-call": false,
                    "outbound-call": false
                }
            },
            iss: "chat",
            nbf: nbf,
            room: `${req.body.location}-${req.body.table}`,
            exp: exp,
            sub: process.env.JAAS_APP_ID
        }, privateKey, options);

        joinTable(res.locals.user, req.body.location, req.body.table);

        return res.json(token);
    },

    /*
    GET: retrieve table information for a single location
    req.params.location
     */
    getLocation: function(location, ws, user){
        ws.location = location;
        ws.user = user._id.toString();

        let loc = {};
        Location.findOne({_id: location})
            .then((response)=>{
                loc = response;
                
                return Office.find({location: loc._id}, {name: 1});
            })
            .then((offices)=>{
                let data = {
                    location: loc,
                    offices: offices,
                    action: "getLocation"
                };
                ws.send(JSON.stringify(data));
            })
            .catch((err)=>{
                console.error(err);
                ws.send({
                    error: true,
                    message: "Server error"
                });
            });
    },

    /*
     GET, retrieve list of all locations
     */
    getAll: function(req, res){
        Location.find({}, {_id: 1, name: 1})
            .then((locations)=>{
                res.json(locations);
            })
            .catch((err)=>{
                console.error(err);
                res.json({
                    error: true,
                    message: "Server error"
                });
            });
    }
}
