const mongoose = require("mongoose");

const OfficeSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "location",
        required: true
    },
    name: {
        type: String,
        required: true
    },
    tables: [{
        type: {
            type: String,
            required: true
        },
        occupants: [{
            seatNumber: {
                type: Number,
                required: true
            },
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                required: false
            },
            name: {
                type: String,
                required: false
            },
            avatar: {
                type: String,
                required: false
            }
        }]
    }]
});

module.exports = mongoose.mode("office", OfficeSchema);
