import type { MonitorType } from "@/types/index.js";

export interface CheckMetadata {
	monitorId: string;
	teamId: string;
	type: MonitorType;
}

export interface CheckTimingPhases {
	wait: number;
	dns: number;
	tcp: number;
	tls: number;
	request: number;
	firstByte: number;
	download: number;
	total: number;
}

export interface CheckTimings {
	start: number;
	socket: number;
	lookup: number;
	connect: number;
	secureConnect: number;
	upload: number;
	response: number;
	end: number;
	phases: CheckTimingPhases;
}

export interface CheckCpuInfo {
	physical_core: number;
	logical_core: number;
	frequency: number;
	temperature: number[];
	free_percent: number;
	usage_percent: number;
}

export interface CheckMemoryInfo {
	total_bytes: number;
	available_bytes: number;
	used_bytes: number;
	usage_percent: number;
}

export interface CheckHostInfo {
	os: string;
	platform: string;
	kernel_version: string;
}

export interface CheckCaptureInfo {
	version: string;
	mode: string;
}

export interface CheckContainerSwarmInfo {
	node_id: string;
	service_id: string;
	task_id: string;
}

export interface CheckContainerStats {
	cpu_percent: number;
	memory_usage: number;
	memory_limit: number;
	memory_percent: number;
	network_rx_bytes: number;
	network_tx_bytes: number;
	block_read_bytes: number;
	block_write_bytes: number;
	pids: number;
}

export interface CheckContainerInfo {
	container_id: string;
	container_name: string;
	status: string;
	health?: {
		healthy: boolean;
		source: string;
		message: string;
	};
	running: boolean;
	base_image: string;
	exposed_ports: Array<{ port: string; protocol: string }>;
	started_at: number;
	finished_at: number;
	stats: CheckContainerStats;
	swarm?: CheckContainerSwarmInfo;
}

export interface CheckSwarmNodeInfo {
	id: string;
	hostname: string;
	status: string;
	availability: string;
	role: string;
	manager_status?: {
		leader: boolean;
		reachability: string;
	};
}

export interface CheckSwarmServiceInfo {
	id: string;
	name: string;
	image: string;
	mode: string;
	replicas: number;
	running_tasks: number;
}

export interface CheckSwarmInfo {
	is_swarm: boolean;
	node_id?: string;
	node_name?: string;
	role?: string;
	status?: string;
	nodes?: CheckSwarmNodeInfo[];
	services?: CheckSwarmServiceInfo[];
}

export interface CheckDiskInfo {
	device: string;
	mountpoint: string;
	read_speed_bytes: number;
	write_speed_bytes: number;
	total_bytes: number;
	free_bytes: number;
	usage_percent: number;
}

export interface CheckErrorInfo {
	metric: string[];
	err: string;
}

export interface CheckNetworkInterfaceInfo {
	name: string;
	bytes_sent: number;
	bytes_recv: number;
	packets_sent: number;
	packets_recv: number;
	err_in: number;
	err_out: number;
	drop_in: number;
	drop_out: number;
	fifo_in: number;
	fifo_out: number;
}

export interface CheckAudits {
	cls: ILighthouseAudit;
	si: ILighthouseAudit;
	fcp: ILighthouseAudit;
	lcp: ILighthouseAudit;
	tbt: ILighthouseAudit;
}

export interface ILighthouseAudit {
	id?: string;
	title?: string;
	score?: number | null;
	displayValue?: string;
	numericValue?: number;
	numericUnit?: string;
}

export interface Check {
	id: string;
	metadata: CheckMetadata;
	status: boolean | "degraded";
	responseTime: number;
	timings: CheckTimings;
	statusCode: number;
	message: string;
	ack: boolean;
	ackAt?: string | null;
	expiry: string;
	cpu: CheckCpuInfo;
	memory: CheckMemoryInfo;
	disk: CheckDiskInfo[];
	host: CheckHostInfo;
	docker?: CheckContainerInfo[];
	swarm?: CheckSwarmInfo;
	errors: CheckErrorInfo[];
	capture: CheckCaptureInfo;
	net: CheckNetworkInterfaceInfo[];
	accessibility?: number;
	bestPractices?: number;
	seo?: number;
	performance?: number;
	audits?: CheckAudits;
	__v: number;
	createdAt: string;
	updatedAt: string;
}
