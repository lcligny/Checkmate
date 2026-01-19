import { CheckModel } from "@/db/models/index.js";

async function optimizedMonitoringIndexes() {
	const collection = CheckModel.collection;

	// Define desired composite indexes
	const indexes = [
		{ spec: { "metadata.monitorId": 1, "createdAt": -1 }, options: { name: "metadata.monitorId_1_createdAt_-1" } },
		{ spec: { "metadata.monitorId": 1, "metadata.type": 1, "createdAt": -1 }, options: { name: "metadata.monitorId_1_metadata.type_1_createdAt_-1" } },
		{ spec: { "metadata.monitorId": 1, "status": 1, "createdAt": -1 }, options: { name: "metadata.monitorId_1_status_1_createdAt_-1" } },
		{ spec: { "metadata.teamId": 1, "createdAt": -1 }, options: { name: "metadata.teamId_1_createdAt_-1" } },
		{ spec: { "metadata.teamId": 1, "status": 1, "createdAt": -1 }, options: { name: "metadata.teamId_1_status_1_createdAt_-1" } },
	];

	// Create composite indexes
	for (const index of indexes) {
		try {
			await collection.createIndex(index.spec, index.options);
		} catch (error) {
			console.error(`[Migration] Failed to create index ${index.options.name}:`, error);
			// Continue with other indexes even if one fails
		}
	}

	// Correct TTL index: Remove old one if exists and create new one without partial filter
	try {
		// Attempt to drop the index named 'expiry_1' which might have the faulty partial filter
		// Or any index on the 'expiry' field that is a TTL index.
		const existingIndexes = await collection.indexes();
		const ttlIndex = existingIndexes.find(idx => idx.key.expiry !== undefined);
		
		if (ttlIndex) {
			await collection.dropIndex(ttlIndex.name);
		}
	} catch (error) {
		console.warn("[Migration] Warning when dropping old TTL index (may not exist):", error);
	}

	try {
		// Create new TTL index. We use a default of 30 days (2592000 seconds) if not easily fetchable, 
        // but typically the application will update it later via CheckModule.updateChecksTTL
		await collection.createIndex({ expiry: 1 }, { expireAfterSeconds: 0 });
	} catch (error) {
		console.error("[Migration] Failed to create TTL index:", error);
	}
}

export { optimizedMonitoringIndexes };
