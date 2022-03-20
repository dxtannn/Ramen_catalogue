if(process.env.NODE_ENV !== "production"){
    require('dotenv').config()
}

const express = require('express')
const app = express()
const path = require('path')
const ejsMate = require('ejs-mate')
const methodOverride = require('method-override')
const mongoose = require('mongoose')
const Ramen = require('./models/main')
const Review = require('./models/review')
const {ramenSchema, reviewSchema} = require('./errorschema')
const catchasync = require('./utility/catchasync')
const ExpressError = require('./utility/ExpressError')
const multer  = require('multer')
const {storage,cloudinary} = require('./cloudinary')
const upload = multer({ storage })
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const token = process.env.MAPBOX_TOKEN
const geoCoder = mbxGeocoding({accessToken:token})

mongoose.connect('mongodb://localhost:27017/ramen', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

const validateRamen = (req,res,next) =>{
    const {error} = ramenSchema.validate(req.body)
    if(error){
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg,400)
    }else{
        next()
    }
}

const validateReview = (req,res,next) =>{
    const {error} = reviewSchema.validate(req.body)
    if(error){
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg,400)
    }else{
        next()
    }
}

searchdict = {}

app.get('/', (req, res) => {
    res.render('home')
})

app.get('/catalogue', catchasync(async (req, res) => {
    const ramen = await Ramen.find({})
    res.render('catalogue', { ramen })
}))

app.post('/catalogue',upload.array('image'),validateRamen,catchasync(async (req, res) => {
    const geoData = await geoCoder.forwardGeocode({
        query:req.body.country,
        limit:1
    }).send()
    const ramen = new Ramen(req.body)
    ramen.geometry = geoData.body.features[0].geometry
    ramen.image = req.files.map(f=>({url:f.path, filename:f.filename}))
    await ramen.save()
    res.redirect(`catalogue/${ramen._id}`)
}))

app.get('/catalogue/new', async (req, res) => {
    res.render('new')
})

app.get('/catalogue/search', catchasync(async (req, res) => {
    const ramen = await Ramen.find({})
    let x = []
    let y = []
    for (let item of ramen) {
        if (!x.includes(item.style)) {
            x.push(item.style)
        }
    }
    for (let item of x) {
        y.push({ style: item })
    }
    stylearray = y.slice(0, -1)
    const searchdata = await Ramen.find(searchdict)
    res.render('search', { stylearray, searchdata, searchdict })
}))

app.post('/catalogue/search', catchasync(async (req, res) => {
    searchdict = {}
    const { brand, country, stars, style } = req.body
    searchdict = { brand, country, stars, style }
    for (let property in searchdict) {
        if (searchdict[property] === "") {
            delete searchdict[property]
        }
    }
    if (searchdict.stars) {
        searchdict.stars = { $gte: searchdict.stars }
    }
    res.redirect('/catalogue/search')
}))

app.get('/catalogue/:id',catchasync(async(req,res) => {
    const ramen = await Ramen.findById(req.params.id).populate('reviews')
    res.render('show', { ramen })
}))

app.put('/catalogue/:id',upload.array('image'),validateRamen, catchasync(async(req,res) => {
    const {id} = req.params
    const ramen = await Ramen.findByIdAndUpdate(id,{...req.body})
    const newImg = req.files.map(f=>({url:f.path, filename:f.filename}))
    ramen.image.push(...newImg)
    await ramen.save()
    if(req.body.deleteImages){
        for(let filename of req.body.deleteImages){
            await cloudinary.uploader.destroy(filename)
        }
        await ramen.updateOne({$pull:{image:{filename:{$in:req.body.deleteImages}}}})
    }
    res.redirect(`/catalogue/${ramen._id}`)
}))

app.delete('/catalogue/:id',catchasync(async(req,res)=>{
    const {id} = req.params
    const ramen = await Ramen.findById(id)
    const reviewId = ramen.reviews
    for(let review of reviewId){
        await Review.findByIdAndDelete(review)
    }
    await Ramen.findByIdAndDelete(id)
    res.redirect('/catalogue')
}))

app.get('/catalogue/:id/edit',catchasync(async(req,res) => {
    const ramen = await Ramen.findById(req.params.id)
    res.render('edit', { ramen })
}))

app.post('/catalogue/:id/review',validateReview,catchasync(async(req,res) => {
    const ramen = await Ramen.findById(req.params.id)
    const review = new Review(req.body)
    ramen.reviews.push(review)
    await review.save()
    await ramen.save()
    res.redirect(`/catalogue/${ramen._id}`)
}))

app.delete('/catalogue/:id/review/:reviewId',catchasync(async(req,res) => {
    const {id,reviewId} = req.params
    await Ramen.findByIdAndUpdate(id, {$pull:{reviews:reviewId}})
    await Review.findByIdAndDelete(reviewId)
    res.redirect(`/catalogue/${id}`)
}))

app.all('*',(req,res,next)=>{
    next(new ExpressError('Page not found', 404))
})

app.use((error,req,res,next)=>{
    if(!error.msg){
        error.msg = "Something went wrong!"
    }
    if(!error.status){
        error.status = 500
    }
    res.status(error.status).render('error',{error})
})

app.listen(3000, () => {
    console.log('Server is up')
})

