const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require('../utils/wrapAsync.js');
const { validateReview, isLoggedIn, isReviewAuthor } = require("../middleware.js");

const reviewController = require('../controllers/reviews.js');
// post route for review
router.post(
    "/",
    isLoggedIn,
    validateReview,
    // isReviewAuthor,
    //  wrapAsync,
    (reviewController.createReview));

// for delete review
router.delete(
    "/:reviewId",
    isLoggedIn,
    isReviewAuthor,
    wrapAsync(reviewController.deleteReview))

module.exports = router;