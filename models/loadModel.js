const { Datastore } = require("@google-cloud/datastore");
const { LOAD, BOAT } = require("../utils/constants.js");

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
	try {
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
		};
	} catch (err) {
		console.error(err);
		throw new Error("Datastore Error");
	}
}

async function get_load(id, baseUrl) {
	try {
		const key = datastore.key([LOAD, parseInt(id, 10)]);
		const [entity] = await datastore.get(key);
		if (!entity) {
			return null;
		}

		if (entity.carrier) {
			const boatKey = datastore.key([BOAT, parseInt(entity.carrier, 10)]);
			const [boat] = await datastore.get(boatKey);
			if (boat) {
				entity.carrier = {
					id: Number(boat[Datastore.KEY].id),
					name: boat.name,
					self: createSelf(baseUrl, boat[Datastore.KEY].id, true),
				};
			}
		}

		return { ...addId(entity), self: createSelf(baseUrl, id) };
	} catch (err) {
		console.error(err);
		throw new Error("Datastore Error");
	}
}

const RESULTS_PER_PAGE = 5;

async function get_loads(baseUrl, cursor) {
	try {
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

		let results = {
			loads: loads,
		};

		if (info.moreResults !== Datastore.NO_MORE_RESULTS) {
			results.next = baseUrl + "/loads?cursor=" + info.endCursor;
		}

		return results;
	} catch (err) {
		console.error(err);
		throw new Error("Datastore Error");
	}
}

async function get_boat_loads(boatId, baseUrl) {
    try {
        const q = datastore
            .createQuery(LOAD)
            .filter("carrier", "=", Number(boatId));
        const [entities] = await datastore.runQuery(q);

        const carrierPromises = [];
        for (const entity of entities) {
            const carrierPromise = datastore.key([BOAT, parseInt(entity.carrier, 10)]);
            carrierPromises.push(datastore.get(carrierPromise));
        }

        const allCarriers = await Promise.all(carrierPromises);

        const loads = entities.map((entity, index) => {
            const carrierEntity = allCarriers[index];
            if (carrierEntity) {
                entity.carrier = {
                    id: Number(carrierEntity[0][Datastore.KEY].id),
                    name: carrierEntity[0].name,
                    self: createSelf(baseUrl, carrierEntity[0][Datastore.KEY].id, true),
                };
            }

            return {
                ...addId(entity),
                self: createSelf(baseUrl, entity[Datastore.KEY].id),
            };
        });

        return { loads: loads };
    } catch (err) {
        console.error(err);
        throw new Error("Datastore Error");
    }
}

async function manage_load(id, boat_id, owner, removeCarrier = false) {
	const loadKey = datastore.key([LOAD, parseInt(id, 10)]);
	const boatKey = datastore.key([BOAT, parseInt(boat_id, 10)]);
	const [load, boat] = await Promise.all([
		datastore.get(loadKey),
		datastore.get(boatKey),
	]);

	
	if (!load[0] || !boat[0]) {
		throw new Error("NOT_FOUND");
	}
	
	if (boat[0].owner !== owner) {
		throw new Error("FORBIDDEN");
	}
	
	if (!removeCarrier && load[0].carrier) {
		throw new Error("FORBIDDEN");
	}

	if (removeCarrier && load[0].carrier !== Number(boat_id)) {
		throw new Error("NOT_FOUND");
	}

	const updateLoad = {
		...load[0],
		carrier: removeCarrier ? null : Number(boat_id),
	};
	await datastore.update({ key: loadKey, data: updateLoad });
}

async function delete_load(id) {
	try {
		const loadKey = datastore.key([LOAD, parseInt(id, 10)]);
		const [loadExists] = await datastore.get(loadKey);
		if (!loadExists) {
			return null;
		}

		return datastore.delete(loadKey);
	} catch (err) {
		console.error(err);
		throw new Error("Datastore Error");
	}
}

module.exports = {
	post_load,
	get_load,
	get_loads,
	get_boat_loads,
	manage_load,
	delete_load,
};
