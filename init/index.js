const mongoose = require('mongoose');
const initData = require('./data.js');
const Listing = require('../models/listing.js');

 main().then(()=>console.log('MongoDB connected...')).catch(err => console.log(err));
    async function main(){
        await mongoose.connect('mongodb://localhost:27017/wanderlust');
    }

    const initDB = async () => {
        await Listing.deleteMany({});
        initData.data = initData.data.map((obj)=>({
            ...obj,
            owner:"689b0d9e277cf3ab12409a82",
        }));
        await Listing.insertMany(initData.data);
        console.log("data is initialized");
    }

    initDB();


