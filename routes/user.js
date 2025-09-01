const express = require('express');
const wrapAsync = require('../utils/wrapAsync');
const router = express.Router();
const User = require("../models/user.js");
const passport = require('passport');
const { saveRedirectUrl } = require('../middleware.js');

const userController = require('../controllers/users.js');

router
.route("/signup")
.get(userController.newRenderForm)
.post(wrapAsync(userController.signUp));

router
.route("/login")
.get(userController.loginRenderForm)
.post(
    saveRedirectUrl,
    passport.authenticate("local",{
    failureRedirect:"/login",
    failureFlash:true,
}),
userController.Login
)

router.get("/logout",userController.LogOut)

module.exports = router;