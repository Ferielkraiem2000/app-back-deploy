const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    companyName: { type: String, required: true },
    workEmail: { type: String, required: true },
    password: { type: String, required: true },
});

module.exports = mongoose.model('User', UserSchema);
