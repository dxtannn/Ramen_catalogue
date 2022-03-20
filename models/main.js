const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Review = require('./review')
const RamenSchema = new Schema({
    brand: String,
    variety: String,
    image:[{
        url:String,
        filename:String
    }],
    style: String,
    country: String,
    stars: String,
    reviews:[
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'
        }
    ],
    geometry:{
        type:{
            type:String,
            enum:['Point'],
            required:true
        },
        coordinates:{
            type:[Number],
            required:true
        }
    }
})

module.exports = mongoose.model('Ramen', RamenSchema)