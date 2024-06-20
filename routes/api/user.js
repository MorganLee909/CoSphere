const User = require("../../models/user.js");
const Office = require("../../models/office.js");
const Location = require("../../models/location.js");
const controller = require("../../controllers2/user.js");
const {auth} = require("../../auth.js");

const sendEmail = require("../../controllers/sendEmail.js");
const confirmationEmail = require("../../email/confirmationEmail.js");

const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.COSPHERE_STRIPE_KEY);

module.exports = (app)=>{
    /*
    POST: create new user
    req.body = {
        email: String
        password: String
        confirmPassword: String
        firstName: String
        lastName: String
    }
    */
    app.post("/user", async (req, res)=>{
        try{
            const email = req.body.email.toLowerCase();
            const matchingUserProm = User.findOne({email: req.body.email});
            const officesProm = Office.find({users: {$elemMatch: {email: email}}});
            const stripCustomerProm = stripe.customers.create({email: email});
            const locationProm = Location.findOne({}, {_id: 1});

            let matchingUser, userOffices, stripeCustomer, location;
            [matchingUser, userOffices, stripeCustomer, location] = await Promise.all([
                matchingUserProm,
                officesProm,
                stripCustomerProm,
                locationProm
            ]);

            if(!controller.isValidEmail(email)) throw "badEmail";
            if(!controller.passwordsMatch(req.body.password, req.body.confirmPassword)) throw "passwordMatch";
            if(!controller.passwordValidLength(req.body.password)) throw "shortPassword";
            if(matchingUser) throw "userExists";

            let newUser = {};
            if(userOffices.length > 0){
                newUser = controller.createOfficeUser({
                    ...req.body,
                    email: email
                }, location, stripeCustomer);
                let offices = controller.activateOfficeUser(email, newUser._id, userOffices);
                Promise.all(offices.map(o => o.save()));
            }else{
                let confirmationCode = controller.confirmationCode();
                newUser = controller.createUser({
                    ...req.body,
                    email: email
                }, location, stripeCustomer, confirmationCode);

                let html = confirmationEmail(
                    newUser.firstName,
                    `${req.protocol}://${req.get("host")}/email/code/${email}/${confirmationCode}`
                );
                sendEmail(email, "CoSphere email verification", html);
            }

            newUser = await newUser.save();
            const token = jwt.sign({
                _id: newUser._id,
                email: newUser.email,
                session: newUser.session
            }, process.env.JWT_SECRET);
            res.json({
                error: false,
                message: "Please check your inbox to verify your email",
                token: token
            });
        }catch(e){
            res.json(controller.handleError(e));
        }
    });

    app.get("/user", auth, (req, res)=>{
        res.locals.user.password = undefined;
        res.locals.user.stripe = undefined;

        res.json(res.locals.user);
    });

    app.get("/email/code/:email/:code", async (req, res)=>{
        try{
            let user = await User.findOne({email: req.params.email});
            if(user.status === "payment") return res.redirect("/dashboard");
            if(user.status === "active") throw "confirmedActive";
            if(!controller.validEmailCode(req.params.code, user.status)) throw "invalidEmailCode";
            user.status = "payment";
            user.save();
            res.redirect("/stripe/checkout");
        }catch(e){
            res.json(controller.handleError(e));
        }
    });

    app.get("/email/resend", async ()=>{
        //Read token
        //Retrieve user
        //Resend email verification
        try{
            const data = controller.readToken(req.headers.authorization);
            const user = await User.findOne({_id: data._id});
            const html = confirmationEmail(
                user.firstName,
                `${req.protocol}://${req.get("host")}/email/code/${user.email}/${user.status}`
            );
            sendEmail(user.email, "CoSphere Email Verification", html);
            res.json({
                error: false
            });
        }catch(e){
            res.json(controller.handleError(e));
        }
    });

    app.post("/user/login", async (req, res)=>{
        try{
            const email = req.body.email.toLowerCase();
            const user = await User.findOne({email: email});
            const isValid = controller.passwordIsValid(req.body.password, user.password);
            if(isValid){
                const token = jwt.sign({
                    _id: user._id,
                    email: user.email,
                    session: user.session
                }, process.env.JWT_SECRET);
                res.json(token);
            }else{
                return res.json({
                    error: true,
                    message: "Email and password do not match"
                });
            }
        }catch(e){
            res.json(controller.handleError(e));
        }
    });
}
