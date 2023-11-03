const mongoose = require("mongoose");
let dbApp = null;
module.exports.getConnection = async () => {
	dbApp = await mongoose.createConnection('mongodb://127.0.0.1/dbNicoRemis', {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	return dbApp;
};