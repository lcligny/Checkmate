import { Schema, model, Types } from "mongoose";
import { MonitorTypes, type MonitorType } from "@/types/monitor.js";
import type {
	Check,
	CheckAudits,
	CheckCaptureInfo,
	CheckCpuInfo,
	CheckDiskInfo,
	CheckErrorInfo,
	CheckHostInfo,
	CheckMemoryInfo,
	CheckMetadata,
	CheckNetworkInterfaceInfo,
	CheckTimings,
	CheckTimingPhases,
	ILighthouseAudit,
} from "@/types/check.js";

type CheckMetadataDocument = Omit<CheckMetadata, "monitorId" | "teamId"> & {
	monitorId: Types.ObjectId;
	teamId: Types.ObjectId;
	type: MonitorType;
};

type CheckDocumentBase = Omit<Check, "id" | "metadata" | "expiry" | "ackAt" | "createdAt" | "updatedAt"> & {
	metadata: CheckMetadataDocument;
	expiry: Date;
	ackAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
	__v: number;
};

interface CheckDocument extends CheckDocumentBase {
	_id: Types.ObjectId;
}

const timingPhasesSchema = new Schema<CheckTimingPhases>(
	{
		wait: { type: Number, default: 0 },
		dns: { type: Number, default: 0 },
		tcp: { type: Number, default: 0 },
		tls: { type: Number, default: 0 },
		request: { type: Number, default: 0 },
		firstByte: { type: Number, default: 0 },
		download: { type: Number, default: 0 },
		total: { type: Number, default: 0 },
	},
	{ _id: false }
);

const timingsSchema = new Schema<CheckTimings>(
	{
		start: { type: Number, default: 0 },
		socket: { type: Number, default: 0 },
		lookup: { type: Number, default: 0 },
		connect: { type: Number, default: 0 },
		secureConnect: { type: Number, default: 0 },
		upload: { type: Number, default: 0 },
		response: { type: Number, default: 0 },
		end: { type: Number, default: 0 },
		phases: {
			type: timingPhasesSchema,
			default: () => ({}),
		},
	},
	{ _id: false }
);

const cpuSchema = new Schema<CheckCpuInfo>(
	{
		physical_core: { type: Number, default: 0 },
		logical_core: { type: Number, default: 0 },
		frequency: { type: Number, default: 0 },
		temperature: { type: [Number], default: [] },
		free_percent: { type: Number, default: 0 },
		usage_percent: { type: Number, default: 0 },
	},
	{ _id: false }
);

const memorySchema = new Schema<CheckMemoryInfo>(
	{
		total_bytes: { type: Number, default: 0 },
		available_bytes: { type: Number, default: 0 },
		used_bytes: { type: Number, default: 0 },
		usage_percent: { type: Number, default: 0 },
	},
	{ _id: false }
);

const diskSchema = new Schema<CheckDiskInfo>(
	{
		device: { type: String, default: "" },
		mountpoint: { type: String, default: "" },
		read_speed_bytes: { type: Number, default: 0 },
		write_speed_bytes: { type: Number, default: 0 },
		total_bytes: { type: Number, default: 0 },
		free_bytes: { type: Number, default: 0 },
		usage_percent: { type: Number, default: 0 },
	},
	{ _id: false }
);

const hostSchema = new Schema<CheckHostInfo>(
	{
		os: { type: String, default: "" },
		platform: { type: String, default: "" },
		kernel_version: { type: String, default: "" },
	},
	{ _id: false }
);

const errorSchema = new Schema<CheckErrorInfo>(
	{
		metric: { type: [String], default: [] },
		err: { type: String, default: "" },
	},
	{ _id: false }
);

const captureSchema = new Schema<CheckCaptureInfo>(
	{
		version: { type: String, default: "" },
		mode: { type: String, default: "" },
	},
	{ _id: false }
);

const swarmManagerStatusSchema = new Schema(
	{
		leader: { type: Boolean },
		reachability: { type: String },
	},
	{ _id: false }
);

const swarmNodeSchema = new Schema(
	{
		id: { type: String },
		hostname: { type: String },
		status: { type: String },
		availability: { type: String },
		role: { type: String },
		manager_status: { type: swarmManagerStatusSchema },
	},
	{ _id: false }
);

const swarmServiceSchema = new Schema(
	{
		id: { type: String },
		name: { type: String },
		image: { type: String },
		mode: { type: String },
		replicas: { type: Number },
		running_tasks: { type: Number },
	},
	{ _id: false }
);

const swarmSchema = new Schema(
	{
		is_swarm: { type: Boolean, default: false },
		node_id: { type: String },
		node_name: { type: String },
		role: { type: String },
		status: { type: String },
		nodes: { type: [swarmNodeSchema] },
		services: { type: [swarmServiceSchema] },
	},
	{ _id: false }
);

const containerSwarmInfoSchema = new Schema(
	{
		node_id: { type: String },
		service_id: { type: String },
		task_id: { type: String },
	},
	{ _id: false }
);

const containerStatsSchema = new Schema(
	{
		cpu_percent: { type: Number },
		memory_usage: { type: Number },
		memory_limit: { type: Number },
		memory_percent: { type: Number },
		network_rx_bytes: { type: Number },
		network_tx_bytes: { type: Number },
		block_read_bytes: { type: Number },
		block_write_bytes: { type: Number },
		pids: { type: Number },
	},
	{ _id: false }
);

const containerInfoSchema = new Schema(
	{
		container_id: { type: String },
		container_name: { type: String },
		status: { type: String },
		health: {
			healthy: { type: Boolean },
			source: { type: String },
			message: { type: String },
		},
		running: { type: Boolean },
		base_image: { type: String },
		exposed_ports: [
			{
				port: { type: String },
				protocol: { type: String },
			},
		],
		started_at: { type: Number },
		finished_at: { type: Number },
		stats: { type: containerStatsSchema },
		swarm: { type: containerSwarmInfoSchema },
	},
	{ _id: false }
);

const networkInterfaceSchema = new Schema<CheckNetworkInterfaceInfo>(
	{
		name: { type: String, default: "" },
		bytes_sent: { type: Number, default: 0 },
		bytes_recv: { type: Number, default: 0 },
		packets_sent: { type: Number, default: 0 },
		packets_recv: { type: Number, default: 0 },
		err_in: { type: Number, default: 0 },
		err_out: { type: Number, default: 0 },
		drop_in: { type: Number, default: 0 },
		drop_out: { type: Number, default: 0 },
		fifo_in: { type: Number, default: 0 },
		fifo_out: { type: Number, default: 0 },
	},
	{ _id: false }
);

const lighthouseAuditSchema = new Schema<ILighthouseAudit>(
	{
		id: { type: String },
		title: { type: String },
		score: { type: Number },
		displayValue: { type: String },
		numericValue: { type: Number },
		numericUnit: { type: String },
	},
	{ _id: false }
);

const auditsSchema = new Schema<CheckAudits>(
	{
		cls: { type: lighthouseAuditSchema, default: undefined },
		si: { type: lighthouseAuditSchema, default: undefined },
		fcp: { type: lighthouseAuditSchema, default: undefined },
		lcp: { type: lighthouseAuditSchema, default: undefined },
		tbt: { type: lighthouseAuditSchema, default: undefined },
	},
	{ _id: false }
);

const metadataSchema = new Schema<CheckMetadataDocument>(
	{
		monitorId: {
			type: Schema.Types.ObjectId,
			ref: "Monitor",
			required: true,
			immutable: true,
			index: true,
		},
		teamId: {
			type: Schema.Types.ObjectId,
			ref: "Team",
			required: true,
			immutable: true,
			index: true,
		},
		type: {
			type: String,
			enum: MonitorTypes,
			required: true,
			index: true,
		},
	},
	{ _id: false }
);

const CheckSchema = new Schema<CheckDocument>(
	{
		metadata: {
			type: metadataSchema,
			required: true,
		},
		status: {
			type: Boolean,
			index: true,
		},
		responseTime: {
			type: Number,
		},
		timings: {
			type: timingsSchema,
			default: undefined,
		},
		statusCode: {
			type: Number,
			index: true,
		},
		message: {
			type: String,
		},
		expiry: {
			type: Date,
			default: Date.now,
		},
		ack: {
			type: Boolean,
			default: false,
		},
		ackAt: {
			type: Date,
			default: undefined,
		},
		cpu: {
			type: cpuSchema,
			default: () => ({}),
		},
		memory: {
			type: memorySchema,
			default: () => ({}),
		},
		disk: {
			type: [diskSchema],
			default: () => [],
		},
		host: {
			type: hostSchema,
			default: () => ({}),
		},
		docker: {
			type: [containerInfoSchema],
			default: undefined,
		},
		swarm: {
			type: swarmSchema,
			default: undefined,
		},
		errors: {
			type: [errorSchema],
			default: () => [],
		},
		capture: {
			type: captureSchema,
			default: () => ({}),
		},
		net: {
			type: [networkInterfaceSchema],
			default: () => [],
		},
		accessibility: {
			type: Number,
		},
		bestPractices: {
			type: Number,
		},
		seo: {
			type: Number,
		},
		performance: {
			type: Number,
		},
		audits: {
			type: auditsSchema,
			default: undefined,
		},
	},
	{
		timestamps: true,
		strict: false,
		timeseries: {
			timeField: "createdAt",
			metaField: "metadata",
			granularity: "seconds",
		},
	}
);

CheckSchema.index({ updatedAt: 1 });
CheckSchema.index({ "metadata.monitorId": 1, createdAt: -1 });
CheckSchema.index({ "metadata.monitorId": 1, "metadata.type": 1, createdAt: -1 });
CheckSchema.index({ "metadata.monitorId": 1, status: 1, createdAt: -1 });
CheckSchema.index({ "metadata.teamId": 1, createdAt: -1 });
CheckSchema.index({ "metadata.teamId": 1, status: 1, createdAt: -1 });

const CheckModel = model<CheckDocument>("Check", CheckSchema);

export type { CheckDocument, CheckMetadataDocument };
export { CheckModel };
export default CheckModel;
