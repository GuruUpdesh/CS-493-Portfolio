const { Datastore } = require("@google-cloud/datastore");
const { USER } = require("../utils/constants.js");

const datastore = new Datastore();

async function add_user(id, name, email) {
	try {
        const key = datastore.key(USER);
        // check if user already exists
        const q = datastore
            .createQuery(USER)
            .filter("user_id", "=", id);

        const [users] = await datastore.runQuery(q);
        if (users.length > 0) {
            console.log("User already exists");
            return users[0];
        }

        console.log("Creating new user")
		const new_user = { user_id: id, name: name, email: email };
		await datastore.save({ key: key, data: new_user });
		return {
			id: Number(key.id),
			...new_user,
		};
	} catch (err) {
		console.error(err);
		throw new Error("Datastore Error");
	}
}

async function get_users() {
    try {
        const q = datastore.createQuery(USER);
        const [users] = await datastore.runQuery(q);
        return users.map((user) => {
            return user;
        });
    } catch (err) {
        console.error(err);
        throw new Error("Datastore Error");
    }
}

module.exports = { add_user, get_users };