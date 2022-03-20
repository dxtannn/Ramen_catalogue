const data = require('./data')
const mongoose = require('mongoose')
const Ramen = require('../models/main')

const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const geoCoder = mbxGeocoding({accessToken: 'pk.eyJ1IjoiZHh0YW4iLCJhIjoiY2tyeGJtdzNwMDMzbzJ1bjc4NTA4OHVlbyJ9.TEtu3MW5gOUf2lJ1gfqrsA'})

mongoose.connect('mongodb://localhost:27017/ramen', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const inputData = async () => {
    await Ramen.deleteMany({})
    for (let item of data) {
        const result = new Ramen({
            brand: `${item.Brand}`,
            variety: `${item.Variety}`,
            style: `${item.Style}`,
            country: `${item.Country}`,
            stars: `${item.Stars}`,
            image:     [
                {
                  url: 'https://res.cloudinary.com/dg4md3p8r/image/upload/v1627988256/Ramen/y81wnwypuag0ezowhzo8.jpg',
                  filename: 'Ramen/y81wnwypuag0ezowhzo8'
                },
                {
                  url: 'https://res.cloudinary.com/dg4md3p8r/image/upload/v1627988258/Ramen/vobawdcqxjafninmvrha.jpg',
                  filename: 'Ramen/vobawdcqxjafninmvrha'
                }
              ],
            geometry: {
            type: "Point",
            coordinates: []
            }
        })
        const geoData = await geoCoder.forwardGeocode({
            query:result.country,
            limit:1
        }).send()
        result.geometry = geoData.body.features[0].geometry
        await result.save()
    }
    console.log('Data has been saved')
}



inputData()
    .then(() => {
        mongoose.connection.close()
        console.log('Connection with database ended')
    })
