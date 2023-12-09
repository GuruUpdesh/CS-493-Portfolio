const { Datastore } = require("@google-cloud/datastore");
const { BOAT, LOAD } = require("../utils/constants.js");
const { AppError, errorMessages } = require("../utils/errorHandler.js");

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
async function post_boat(name, type, length, owner, baseUrl) {
	const key = datastore.key(BOAT);
	const new_boat = {
		name: name,
		type: type,
		length: length,
		owner: owner,
	};
	await datastore.save({ key: key, data: new_boat });
	return {
		id: Number(key.id),
		...new_boat,
		loads: [],
		self: createSelf(baseUrl, key.id),
	};
}

async function get_boat(id, owner, baseUrl) {
	const key = datastore.key([BOAT, parseInt(id, 10)]);
	const [entity] = await datastore.get(key);

	if (!entity) {
		throw new AppError(404, errorMessages[BOAT].invalidBoatId);
	}

	if (entity.owner !== owner) {
		throw new AppError(403, errorMessages[BOAT].notOwner);
	}

	const q = datastore.createQuery(LOAD).filter("carrier", "=", Number(id));
	const [loads] = await datastore.runQuery(q);
	entity.loads = loads.map((load) => {
		load.id = Number(load[Datastore.KEY].id);
		return {
			id: Number(load[Datastore.KEY].id),
			self: createSelf(baseUrl, load.id, true),
		};
	});

	return { ...addId(entity), self: createSelf(baseUrl, id) };
}

const RESULTS_PER_PAGE = 5;

async function get_boats(owner, baseUrl, cursor) {
	const q = datastore
		.createQuery(BOAT)
		.limit(RESULTS_PER_PAGE)
		.filter("owner", "=", owner);

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

	const totalQ = datastore.createQuery(BOAT);
	const [total] = await datastore.runQuery(totalQ);

	let results = {
		boats: boats,
		total: total.length,
	};

	if (info.moreResults !== Datastore.NO_MORE_RESULTS) {
		results.next = baseUrl + "/boats?cursor=" + info.endCursor;
	}

	return results;
}

async function patch_boat(id, boat, owner, baseUrl) {
	const key = datastore.key([BOAT, parseInt(id, 10)]);
	const [data] = await datastore.get(key);

	if (!data) {
		throw new AppError(404, errorMessages[BOAT].invalidBoatId);
	}

	if (data.owner !== owner) {
		throw new AppError(403, errorMessages[BOAT].notOwner);
	}

	const currentBoat = data;
	const updateBoat = { ...currentBoat, ...boat };
	await datastore.update({ key, data: updateBoat });
	return {
		id: Number(key.id),
		...updateBoat,
		self: createSelf(baseUrl, key.id),
	};
}

async function delete_boat(id, owner) {
	const boatKey = datastore.key([BOAT, parseInt(id, 10)]);
	const [boatExists] = await datastore.get(boatKey);

	if (!boatExists) {
		throw new AppError(404, errorMessages[BOAT].invalidBoatId);
	}

	if (boatExists.owner !== owner) {
		throw new AppError(403, errorMessages[BOAT].notOwner);
	}

	const q = datastore.createQuery(LOAD).filter("carrier", "=", Number(id));
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
}

module.exports = {
	post_boat,
	get_boat,
	get_boats,
	patch_boat,
	delete_boat,
};
