const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('@fluidjs/multer-cloudinary');
const multer = require('multer');

// configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.API_SECRET_KEY
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'wanderlust_DEV',
    allowed_formats: ['png', 'jpg', 'jpeg'],
    // you can also add transformation options here
  }
});

const upload = multer({ storage });

module.exports = {
  cloudinary,
  storage,
};
