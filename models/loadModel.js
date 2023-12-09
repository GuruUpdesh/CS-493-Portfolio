const { Datastore } = require("@google-cloud/datastore");
const { LOAD, BOAT, RESULTS_PER_PAGE } = require("../utils/constants.js");
const { AppError, errorMessages } = require("../utils/errorHandler.js");

const datastore = new Datastore();

function addId(item) {
	item.id = Number(item[Datastore.KEY].id);
	return item;
}

function createSelf(url, id, isBoat) {
	if (isBoat) return url + "/boats/" + id;
	return url + "/loads/" + id;
}

// Load model
async function post_load(volume, item, creation_date, baseUrl) {
	const key = datastore.key(LOAD);
	const new_load = {
		volume: volume,
		item: item,
		carrier: null,
		creation_date: creation_date,
	};
	await datastore.save({ key: key, data: new_load });
	return {
		id: Number(key.id),
		...new_load,
		self: createSelf(baseUrl, key.id),
		root: baseUrl + "/loads",
	};
}

async function get_load(id, baseUrl) {
	const key = datastore.key([LOAD, parseInt(id, 10)]);
	const [entity] = await datastore.get(key);
	if (!entity) {
		throw new AppError(404, errorMessages[LOAD].invalidLoadId);
	}

	if (entity.carrier) {
		const boatKey = datastore.key([BOAT, parseInt(entity.carrier, 10)]);
		const [boat] = await datastore.get(boatKey);
		if (boat) {
			entity.carrier = {
				id: Number(boat[Datastore.KEY].id),
				name: boat.name,
				self: createSelf(baseUrl, boat[Datastore.KEY].id, true)
			};
		}
	}

	return { ...addId(entity), self: createSelf(baseUrl, id), root: baseUrl + "/loads" };
}

async function get_loads(baseUrl, cursor) {
	const q = datastore.createQuery(LOAD).limit(RESULTS_PER_PAGE);

	if (cursor) {
		q.start(cursor);
	}

	const [entities, info] = await datastore.runQuery(q);

	const carrierPromises = [];
	for (const entity of entities) {
		if (entity.carrier) {
			const carrierPromise = datastore.key([
				BOAT,
				parseInt(entity.carrier, 10),
			]);
			carrierPromises.push(datastore.get(carrierPromise));
		} else {
			carrierPromises.push(null);
		}
	}

	const allCarriers = await Promise.all(carrierPromises);

	const loads = entities.map((entity, index) => {
		const carrierEntity = allCarriers[index];
		if (carrierEntity) {
			entity.carrier = {
				id: Number(carrierEntity[0][Datastore.KEY].id),
				name: carrierEntity[0].name,
				self: createSelf(
					baseUrl,
					carrierEntity[0][Datastore.KEY].id,
					true
				),
			};
		}

		return {
			...addId(entity),
			self: createSelf(baseUrl, entity[Datastore.KEY].id),
		};
	});

	const totalQ = datastore.createQuery(LOAD);
	const [total] = await datastore.runQuery(totalQ);

	const results = {
		loads: loads,
	};

	if (total) {
		results.total = total.length;
	}

	if (info.moreResults !== Datastore.NO_MORE_RESULTS) {
		results.next = baseUrl + "/loads?cursor=" + info.endCursor;
	}

	return results;
}

async function patch_load(id, load, baseUrl) {
	const key = datastore.key([LOAD, parseInt(id, 10)]);
	const [data] = await datastore.get(key);

	if (!data) {
		throw new AppError(404, errorMessages[LOAD].invalidLoadId);
	}

	const currentLoad = data;
	const updateLoad = { ...currentLoad, ...load };
	await datastore.update({ key, data: updateLoad });
	return {
		id: Number(key.id),
		...updateLoad,
		self: createSelf(baseUrl, key.id),
		root: baseUrl + "/loads"
	};
}

async function manage_load(id, boat_id, owner, removeCarrier = false) {
	const loadKey = datastore.key([LOAD, parseInt(id, 10)]);
	const boatKey = datastore.key([BOAT, parseInt(boat_id, 10)]);
	const [load, boat] = await Promise.all([
		datastore.get(loadKey),
		datastore.get(boatKey),
	]);

	if (!load[0] || !boat[0]) {
		throw new AppError(404, errorMessages[BOAT].notFound);
	}

	if (boat[0].owner !== owner) {
		throw new AppError(403, errorMessages[BOAT].notOwner);
	}

	if (!removeCarrier && load[0].carrier) {
		throw new AppError(403, errorMessages[BOAT].alreadyLoaded);
	}

	if (removeCarrier && load[0].carrier !== Number(boat_id)) {
		throw new AppError(404, errorMessages[BOAT].mismatchedEntity);
	}

	const updateLoad = {
		...load[0],
		carrier: removeCarrier ? null : Number(boat_id),
	};
	await datastore.update({ key: loadKey, data: updateLoad });
}

async function delete_load(id) {
	const loadKey = datastore.key([LOAD, parseInt(id, 10)]);
	const [loadExists] = await datastore.get(loadKey);
	if (!loadExists) {
		throw new AppError(404, errorMessages[LOAD].invalidLoadId);
	}

	return datastore.delete(loadKey);
}

module.exports = {
	post_load,
	get_load,
	get_loads,
	patch_load,
	manage_load,
	delete_load,
};
