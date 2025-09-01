const express = require("express");
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync.js');
const Listing = require('../models/listing.js');
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const listingController = require('../controllers/listings.js')
const multer = require('multer')
const { storage } = require("../CloudConfig.js");
const upload = multer({ storage });


router
    .route("/")
    .get(wrapAsync(listingController.index))
    .post(
        isLoggedIn,
        upload.single("listing[image]"),
        validateListing,
        wrapAsync(listingController.createListings)
    );

// new route
router.get("/new", isLoggedIn, listingController.newRanderForm);


// edit form route 👇
router.get(
    "/:id/edit",
    isLoggedIn,
    isOwner,
    wrapAsync(listingController.editListings)
);

router
    .route("/:id")
    .get(wrapAsync(listingController.showListings))  //edit
    .put(
        isLoggedIn,
        isOwner,
        upload.single("listing[image]"),
        validateListing,
        wrapAsync(listingController.updateListings)) //update
    .delete(isLoggedIn, isOwner, wrapAsync(listingController.deleteListings))

module.exports = router;