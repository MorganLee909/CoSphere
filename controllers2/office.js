const Office = require("../models/office.js");

/**
 * Determines whether the user is a member of the office
 *
 * @params {[Member]} members - Members of the office to check
 * @params {string} userId - String ID of the user to check
 * @return {boolean} - True is user is member, false otherwise
 */
const userIsAuthorized = (members, userId)=>{
    let isMember = false;
    for(let i = 0; i < members.length; i++){
        if(!members[i].userId) continue;
        if(members[i].userId.toString() === userId){
            if(members[i].status !== "active") return false;
            return true;
        }
    }

    return false;
}

/**
 * Determines if user is the owner of the office
 *
 * @params {Office} office - Office to check for ownership
 * @params {User} user - User to check for ownership
 * @return {boolean} - True if user is owner, false otherwise;
 */
const isOfficeOwner = (office, user)=>{
    return office.owner.toString() === user._id.toString();
}

/**
 * Creates a new table for an office
 *
 * @params {Office} office - Office in which to add a table
 * @return {Office} - Updated office
 */
const createNewTable = (office)=>{
    const newTable = {
        type: "general",
        occupants: []
    };

    for(let i = 0; i < 6; i++){
        newTable.occupants.push({seatNumber: 1});
    }

    office.tables.push(newTable);
    return office;
}

/**
 * Split members into verified/unverified. Allows fetching verified users
 *
 * @param {Office} office - Office containing the members
 * @return {{verified: [Member], unverified: [Member]}} - Members organized by verification
 */
const splitMembersByVerification = (office)=>{
    const members = {
        verified: [],
        unverified: []
    };

    for(let i = 0; i < office.users.length; i++){
        if(office.users[i].userId){
            members.verified.push(office.users[i].userId);
        }else{
            members.unverified.push(office.users[i]);
        }
    }

    return members;
}

/**
 * Create a new office
 * 
 * @param {string} name - Name of the office
 * @param {ObjectId} userId - ID for owner of the office
 * @param {string} location - String ID for location of the office
 * @return {Office} - Newly created office object
 */
const createOffice = (name, userId, location)=>{
    const office = new Office({
        name: name,
        identifier: name.replaceAll(" ", "-"),
        tables: [{
            type: "general",
            occupants: []
        }],
        owner: userId,
        users: [{
            status: "active",
            userId: userId
        }],
        location: location
    });

    for(let i = 0; i < 6; i++){
        office.tables[0].occupants.push({seatNumber: i});
    }

    return office;
}

/**
 * Create an office member from an already signed-up user
 *
 * @param {Office} office - Office to add member to
 * @param {User} user - User to add to office
 * @param {string} email - Email address of new user
 * @return {Office} - Updated office
 */
const createMember = (office, user, email)=>{
    if(user){
        office.users.push({
            status: "awaiting",
            userId: user._id
        });
    }else{
        office.users.push({
            status: "awaiting",
            email: email.toLowerCase()
        });
    }

    return office;
}

const handleError = (error)=>{
    const response = {
        error: true,
        message: ""
    };

    switch(error){
        case "unauthorizedUser":
            response.message = "This office is private";
            break;
        case "notOwner":
            response.message = "You do not own this office";
            break;
        default:
            console.error(error);
            response.message = "Server error";
    }

    return response;
}

module.exports = {
    userIsAuthorized,
    isOfficeOwner,
    createNewTable,
    splitMembersByVerification,
    createOffice,
    createMember,
    handleError
};