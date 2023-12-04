const { Datastore } = require("@google-cloud/datastore");
const { BOAT, LOAD } = require("../utils/constants.js");

const datastore = new Datastore();

function addId(item) {
	item.id = Number(item[Datastore.KEY].id);
	return item;
}

function createSelf(url, id, isLoad) {
	if (isLoad) return url + "/loads/" + id;
	return url + "/boats/" + id;
}

// Boat model
async function post_boat(name, type, length, baseUrl) {
	try {
		const key = datastore.key(BOAT);
		const new_boat = { name: name, type: type, length: length };
		await datastore.save({ key: key, data: new_boat });
		return {
			id: Number(key.id),
			...new_boat,
			loads: [],
			self: createSelf(baseUrl, key.id),
		};
	} catch (err) {
		console.error(err);
		throw new Error("Datastore Error");
	}
}

async function get_boat(id, baseUrl) {
	try {
		const key = datastore.key([BOAT, parseInt(id, 10)]);
		const [entity] = await datastore.get(key);
		if (!entity) {
			return null;
		}

		const q = datastore
			.createQuery(LOAD)
			.filter("carrier", "=", Number(id));
		const [loads] = await datastore.runQuery(q);
		entity.loads = loads.map((load) => {
			load.id = Number(load[Datastore.KEY].id);
			return {
				id: Number(load[Datastore.KEY].id),
				self: createSelf(baseUrl, load.id, true),
			};
		});

		return { ...addId(entity), self: createSelf(baseUrl, id) };
	} catch (err) {
		console.error(err);
		throw new Error("Datastore Error");
	}
}

const RESULTS_PER_PAGE = 3;

async function get_boats(baseUrl, cursor) {
	try {
		const q = datastore.createQuery(BOAT)
		.limit(RESULTS_PER_PAGE);

		if (cursor) {
			q.start(cursor);
		}

		const [entities, info] = await datastore.runQuery(q);

		const loadPromises = [];
		for (const entity of entities) {
			const loadPromise = datastore
				.createQuery(LOAD)
				.filter("carrier", "=", Number(entity[Datastore.KEY].id))
				.run();

			loadPromises.push(loadPromise);
		}

		const allLoads = await Promise.all(loadPromises);

		const boats = entities.map((entity, index) => {
			const loads = allLoads[index][0];
			const mappedLoads = loads.map((load) => {
				return {
					id: Number(load[Datastore.KEY].id),
					self: createSelf(baseUrl, load[Datastore.KEY].id, true),
				};
			});
		
			return {
				...addId(entity),
				loads: mappedLoads,
				self: createSelf(baseUrl, entity[Datastore.KEY].id),
			};
		});

		let results = {
			boats: boats,
		}

		if (info.moreResults !== Datastore.NO_MORE_RESULTS) {
			results.next = baseUrl + "/boats?cursor=" + info.endCursor;
		}

		return results;
	} catch (err) {
		console.error(err);
		throw new Error("Datastore Error");
	}
}

async function patch_boat(id, boat, baseUrl) {
	try {
		const key = datastore.key([BOAT, parseInt(id, 10)]);
		const [data] = await datastore.get(key);

		if (data) {
			const currentBoat = data;
			const updateBoat = { ...currentBoat, ...boat };
			await datastore.update({ key, data: updateBoat });
			return {
				id: Number(key.id),
				...updateBoat,
				self: createSelf(baseUrl, key.id),
			};
		}
		return null;
	} catch (err) {
		console.error(err);
		throw new Error("Datastore Error");
	}
}

async function delete_boat(id) {
	try {
		const boatKey = datastore.key([BOAT, parseInt(id, 10)]);
		const [boatExists] = await datastore.get(boatKey);

		if (!boatExists) {
			return null;
		}

		const q = datastore
			.createQuery(LOAD)
			.filter("carrier", "=", Number(id));
		const [loads] = await datastore.runQuery(q);

		const updatePromises = loads.map((load) => {
			load.carrier = null;
			return datastore.save({
				key: load[Datastore.KEY],
				data: load,
			});
		});

		results = await Promise.all(updatePromises);
		return await datastore.delete(boatKey);
	} catch (err) {
		console.error(err);
		throw new Error("Datastore Error");
	}
}

function delete_all_boats() {
	const q = datastore.createQuery(BOAT);
	datastore.runQuery(q).then((entities) => {
		entities[0].forEach((entity) => {
			datastore.delete(entity[Datastore.KEY]);
		});
	});
}

module.exports = {
	post_boat,
	get_boat,
	get_boats,
	patch_boat,
	delete_boat,
	delete_all_boats,
};
