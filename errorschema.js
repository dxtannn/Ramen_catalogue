const Joi = require('joi')
const {number} = require('joi')

module.exports.ramenSchema= Joi.object({
        variety: Joi.string().required(),
        brand: Joi.string().required(),
        style: Joi.string().required(),
        country: Joi.string().required(),
        stars: Joi.number().required().min(0).max(5),
        deleteImages: Joi.array()
})

module.exports.reviewSchema= Joi.object({
        body: Joi.string().required(),
        stars: Joi.number().required().min(0).max(5)
})