const express = require("express");
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync.js');
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const listingController = require('../controllers/listings.js');
const multer = require('multer');
const { storage } = require("../CloudConfig.js");
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

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

// edit form route
router.get(
  "/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(listingController.editListings)
);

router
  .route("/:id")
  .get(wrapAsync(listingController.showListings))
  .put(
    isLoggedIn,
    isOwner,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.updateListings)
  )
  .delete(isLoggedIn, isOwner, wrapAsync(listingController.deleteListings));

module.exports = router;
