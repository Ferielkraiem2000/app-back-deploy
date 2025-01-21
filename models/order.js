const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    customerId: { type: String, required: true },
    versioningTool: { type: String, required: true },
    hostingType: { type: String, required: true },
    monitoringTool: { type: String, required: true },
    hostingJarTool: { type: String, required: true },
    status: { type: String, required: true },
});

module.exports = mongoose.model('Order', OrderSchema);
