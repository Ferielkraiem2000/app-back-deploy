const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    versioningTool: { type: String, required: true },
    hostingType: { type: String, required: true },
    monitoringTool: { type: String, required: true },
    hostingJarTool: { type: String, required: true },
});

module.exports = mongoose.model('Order', OrderSchema);
