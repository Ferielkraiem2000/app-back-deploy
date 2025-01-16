const mongoose = require('mongoose');

const OctokitSchema = new mongoose.Schema({
    auth: { type: String, required: true },

});

module.exports = mongoose.model('Octokit', OctokitSchema);
