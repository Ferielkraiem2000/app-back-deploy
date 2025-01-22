const mongoose = require('mongoose');

// const OrderSchema = new mongoose.Schema({
//     versioningTool: { type: String, required: true },
//     hostingType: { type: String, required: true },
//     monitoringTool: { type: String, required: true },
//     hostingJarTool: { type: String, required: true },
//     status: { type: String, required: true },
//     customerId: { type: String, required: true },
// });
const OrderSchema = new mongoose.Schema({
    versioningTool: { type: String, required: true },
    hostingType: { type: String, required: true },
    monitoringTool: { type: String, required: true },
    hostingJarTool: { type: String, required: true },
    status: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to User
  }); 

module.exports = mongoose.model('Order', OrderSchema);
