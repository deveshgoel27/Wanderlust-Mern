const User = require("../models/user.js");

module.exports.newRenderForm = (req,res)=>{
    res.render("users/signup.ejs")
};

module.exports.signUp = async(req,res) => {
    try {
        let {username,email,password} = req.body;
        const newuser = new User ({email,username});
        const registeredUser = await User.register(newuser,password);
        console.log(registeredUser);
        req.login(registeredUser,(err)=>{
            if(err){
                return next(err);
            }
            req.flash("success","Welcome to WanderLust");
            res.redirect("/listings");
        });
    } catch (e) {
        req.flash("error",e.message);
        res.redirect("/signup");
    }
}

module.exports.loginRenderForm = (req,res)=>{
    res.render("users/login.ejs");
};

module.exports.Login = async (req,res)=>{
    req.flash("success","Welcome back to wanderlust!");
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
}

module.exports.LogOut = (req,res,next)=>{
    req.logout((err)=>{
        if(err){
            return next(err);
        }
        req.flash("success","You are logged out!");
        res.redirect("/listings");
    })
};