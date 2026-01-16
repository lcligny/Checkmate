import CacheableLookup from "cacheable-lookup";
const SERVICE_NAME = "NetworkService";

class NetworkService {
	static SERVICE_NAME = SERVICE_NAME;

	constructor({
		axios,
		got,
		https,
		jmespath,
		GameDig,
		ping,
		logger,
		http,
		Docker,
		net,
		stringService,
		settingsService,
		monitorsRepository,
		checksRepository,
	}) {
		this.TYPE_PING = "ping";
		this.TYPE_HTTP = "http";
		this.TYPE_PAGESPEED = "pagespeed";
		this.TYPE_HARDWARE = "hardware";
		this.TYPE_DOCKER = "docker";
		this.TYPE_PORT = "port";
		this.TYPE_GAME = "game";
		this.SERVICE_NAME = SERVICE_NAME;
		this.NETWORK_ERROR = 5000;
		this.PING_ERROR = 5001;
		this.axios = axios;
		this.https = https;
		this.jmespath = jmespath;
		this.GameDig = GameDig;
		this.ping = ping;
		this.logger = logger;
		this.http = http;
		this.Docker = Docker;
		this.net = net;
		this.stringService = stringService;
		this.settingsService = settingsService;
		this.monitorsRepository = monitorsRepository;
		this.checksRepository = checksRepository;

		const cacheable = new CacheableLookup();

		this.got = got.extend({
			dnsCache: cacheable,
			timeout: {
				request: 30000,
			},
			retry: { limit: 1 },
		});
	}

	// Helper functions
	async timeRequest(operation) {
		const start = process.hrtime.bigint();
		try {
			const response = await operation();
			const elapsedMs = Math.round(Number(process.hrtime.bigint() - start) / 1_000_000);
			return { response, responseTime: elapsedMs };
		} catch (error) {
			const elapsedMs = Math.round(Number(process.hrtime.bigint() - start) / 1_000_000);
			return { response: null, responseTime: elapsedMs, error };
		}
	}

	// Main entry point
	async requestStatus(monitor) {
		const type = monitor?.type || "unknown";
		switch (type) {
			case this.TYPE_PING:
				return await this.requestPing(monitor);
			case this.TYPE_HTTP:
				return await this.requestHttp(monitor);
			case this.TYPE_PAGESPEED:
				return await this.requestPageSpeed(monitor);
			case this.TYPE_HARDWARE:
				return await this.requestHardware(monitor);
			case this.TYPE_DOCKER:
				return await this.requestDocker(monitor);
			case this.TYPE_PORT:
				return await this.requestPort(monitor);
			case this.TYPE_GAME:
				return await this.requestGame(monitor);
			default:
				return await this.handleUnsupportedType(type);
		}
	}

	async requestPing(monitor) {
		try {
			if (!monitor?.url) {
				throw new Error("Monitor URL is required");
			}

			const rawUrl = monitor.url;
			const sanitizedHost = rawUrl
				.replace(/^https?:\/\//, "")
				.replace(/\/.*$/, "")
				.replace(/:.*/, "");
			const { response, error } = await this.timeRequest(() => this.ping.promise.probe(sanitizedHost));

			if (!response) {
				if (error) {
					throw error;
				}
				throw new Error("Ping failed - no result returned");
			}

			const pingResponse = {
				monitorId: monitor.id,
				teamId: monitor.teamId,
				type: "ping",
				status: response.alive,
				code: 200,
				responseTime: response.time,
				message: "Success",
				payload: response,
			};

			if (error) {
				pingResponse.status = false;
				pingResponse.code = 200;
				pingResponse.message = "Ping failed";
				return pingResponse;
			}

			return pingResponse;
		} catch (err) {
			err.service = this.SERVICE_NAME;
			err.method = "requestPing";
			throw err;
		}
	}

	async requestHttp(monitor) {
		const { url, secret, id, teamId, type, ignoreTlsErrors, jsonPath, matchMethod, expectedValue } = monitor;
		const httpResponse = {
			monitorId: id,
			teamId: teamId,
			type,
		};

		try {
			if (!url) {
				throw new Error("Monitor URL is required");
			}
			const config = {
				headers: secret ? { Authorization: `Bearer ${secret}` } : undefined,
			};

			if (ignoreTlsErrors) {
				config.agent = {
					https: new this.https.Agent({
						rejectUnauthorized: false,
					}),
				};
			}

			const response = await this.got(url, config);

			let payload;
			const contentType = response.headers["content-type"];

			if (contentType && contentType.includes("application/json")) {
				try {
					payload = JSON.parse(response.body);
				} catch {
					payload = response.body;
				}
			} else {
				payload = response.body;
			}

			httpResponse.code = response.statusCode;
			httpResponse.status = response.ok;
			httpResponse.message = response.statusMessage;
			httpResponse.responseTime = response.timings.phases.total || 0;
			httpResponse.payload = payload;
			httpResponse.timings = response.timings || {};

			if (!expectedValue && !jsonPath) {
				return httpResponse;
			}

			if (expectedValue && !jsonPath) {
				let ok = false;
				if (matchMethod === "equal") ok = payload === expectedValue;
				if (matchMethod === "include" && typeof payload === "string") ok = payload.includes(expectedValue);
				if (matchMethod === "regex" && typeof payload === "string") ok = new RegExp(expectedValue).test(payload);

				if (ok === true) {
					return httpResponse;
				} else {
					httpResponse.code = 500;
					httpResponse.status = false;
					httpResponse.message = this.stringService.httpExpectedValueFail;
					return httpResponse;
				}
			}

			if (jsonPath) {
				const contentType = response.headers["content-type"];
				const isJson = contentType?.includes("application/json");
				if (!isJson) {
					httpResponse.status = false;
					httpResponse.message = this.stringService.httpNotJson;
					return httpResponse;
				}
				try {
					const extracted = this.jmespath.search(payload, jsonPath);
					if (expectedValue) {
						let ok = false;
						if (matchMethod === "equal") ok = extracted === expectedValue;
						if (matchMethod === "include" && typeof extracted === "string") ok = extracted.includes(expectedValue);
						if (matchMethod === "regex" && typeof extracted === "string") ok = new RegExp(expectedValue).test(extracted);

						if (ok) {
							httpResponse.extracted = extracted;
							return httpResponse;
						} else {
							httpResponse.status = false;
							httpResponse.code = 500;
							httpResponse.message = this.stringService.httpJsonPathFail;
							httpResponse.extracted = extracted;
							return httpResponse;
						}
					} else {
						const isFalsey = extracted === false || extracted === "false" || extracted === undefined || extracted === null;
						if (!isFalsey) {
							httpResponse.extracted = extracted;
							return httpResponse;
						} else {
							httpResponse.status = false;
							httpResponse.code = 500;
							httpResponse.message = this.stringService.httpJsonPathFail;
							httpResponse.extracted = extracted;
							return httpResponse;
						}
					}
				} catch {
					httpResponse.status = false;
					httpResponse.message = this.stringService.httpJsonPathError;
					return httpResponse;
				}
			}
			return httpResponse;
		} catch (err) {
			if (err.name === "HTTPError" || err.name === "RequestError") {
				httpResponse.code = err?.response?.statusCode || this.NETWORK_ERROR;
				httpResponse.status = false;
				httpResponse.message = err?.response?.statusCode || err.message;
				httpResponse.responseTime = err?.timings?.phases?.total || 0;
				httpResponse.payload = null;
				httpResponse.timings = err?.timings || {};
				return httpResponse;
			}
			err.service = this.SERVICE_NAME;
			err.method = "requestHttp";
			throw err;
		}
	}

	async requestPageSpeed(monitor) {
		try {
			const url = monitor.url;
			if (!url) {
				throw new Error("Monitor URL is required");
			}
			let pageSpeedUrl = `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&category=seo&category=accessibility&category=best-practices&category=performance`;
			const dbSettings = await this.settingsService.getDBSettings();
			if (dbSettings?.pagespeedApiKey) {
				pageSpeedUrl += `&key=${dbSettings.pagespeedApiKey}`;
			} else {
				this.logger.warn({
					message: "PageSpeed API key not found, job not executed",
					service: this.SERVICE_NAME,
					method: "requestPagespeed",
					details: { url },
				});
			}
			return await this.requestHttp({
				...monitor,
				url: pageSpeedUrl,
			});
		} catch (err) {
			err.service = this.SERVICE_NAME;
			err.method = "requestPageSpeed";
			throw err;
		}
	}

	async requestHardware(monitor) {
		try {
			// Fetch general system metrics
			const hardwareResponse = await this.requestHttp(monitor);

			// If general metrics were fetched successfully, try to fetch Docker metrics
			if (hardwareResponse.status && monitor.url) {
				try {
					const dockerUrl = monitor.url.replace(/\/metrics\/?$/, "/metrics/docker");
					const config = {
						headers: monitor.secret ? { Authorization: `Bearer ${monitor.secret}` } : undefined,
					};

					if (monitor.ignoreTlsErrors) {
						config.agent = {
							https: new this.https.Agent({
								rejectUnauthorized: false,
							}),
						};
					}

					const dockerRes = await this.got(dockerUrl, config);
					if (dockerRes.ok) {
						const dockerData = JSON.parse(dockerRes.body);
						if (dockerData && dockerData.data) {
							// Merge Docker and Swarm data into the hardware response payload
							hardwareResponse.payload.data.docker = dockerData.data.containers;
							hardwareResponse.payload.data.swarm = dockerData.data.swarm;

							// Merge any Docker-specific errors
							if (dockerData.errors && dockerData.errors.length > 0) {
								if (!hardwareResponse.payload.errors) {
									hardwareResponse.payload.errors = [];
								}
								hardwareResponse.payload.errors.push(...dockerData.errors);
							}
						}
					}
				} catch (dockerErr) {
					this.logger.warn({
						message: `Failed to fetch Docker metrics for hardware monitor ${monitor.id}: ${dockerErr.message}`,
						service: this.SERVICE_NAME,
						method: "requestHardware",
					});
					// We don't fail the whole hardware check if only Docker metrics fail
				}
			}

			return hardwareResponse;
		} catch (err) {
			err.service = this.SERVICE_NAME;
			err.method = "requestHardware";
			throw err;
		}
	}

	async getSwarmManagerForTeam(teamId) {
		try {
			const monitors = await this.monitorsRepository.findByTeamId(teamId, { type: "hardware" });
			if (!monitors || monitors.length === 0) return null;

			// Fetch latest check for each hardware monitor to find a manager
			for (const monitor of monitors) {
				const latestChecksMap = await this.checksRepository.findLatestChecksByMonitorIds([monitor.id], { limitPerMonitor: 1 });
				const checks = latestChecksMap[monitor.id];
				if (checks && checks.length > 0) {
					const lastCheck = checks[0];
					if (lastCheck.swarm && lastCheck.swarm.is_swarm && lastCheck.swarm.role === "manager") {
						return monitor;
					}
				}
			}
		} catch (error) {
			this.logger.warn({
				message: `Error finding Swarm manager for team ${teamId}: ${error.message}`,
				service: this.SERVICE_NAME,
				method: "getSwarmManagerForTeam",
			});
		}
		return null;
	}

	async getDockerSuggestions({ teamId, q }) {
		try {
			const swarmManager = await this.getSwarmManagerForTeam(teamId);
			if (!swarmManager) {
				return [];
			}

			const dockerUrl = swarmManager.url.replace(/\/metrics\/?$/, "/metrics/docker?all=true");
			const config = {
				headers: swarmManager.secret ? { Authorization: `Bearer ${swarmManager.secret}` } : undefined,
			};

			if (swarmManager.ignoreTlsErrors) {
				config.agent = {
					https: new this.https.Agent({
						rejectUnauthorized: false,
					}),
				};
			}

			const res = await this.got(dockerUrl, config);
			if (!res.ok) {
				throw new Error(`Failed to fetch Docker data from manager ${swarmManager.name}`);
			}

			const dockerData = JSON.parse(res.body);
			const containers = dockerData?.data?.containers || [];
			const services = dockerData?.data?.swarm?.services || [];

			const query = q.toLowerCase();
			const suggestions = [];

			// Add matching containers
			containers.forEach((c) => {
				const name = c.container_name.toLowerCase();
				const id = c.container_id.toLowerCase();
				if (name.includes(query) || id.includes(query)) {
					suggestions.push({
						label: c.container_name,
						value: c.container_id, // Use full ID for precision, but user might want name
						type: "Container",
						details: `ID: ${c.container_id.substring(0, 12)}`,
					});
				}
			});

			// Add matching services
			services.forEach((s) => {
				const name = s.name.toLowerCase();
				const id = s.id.toLowerCase();
				if (name.includes(query) || id.includes(query)) {
					suggestions.push({
						label: s.name,
						value: s.name, // Services are usually referenced by name
						type: "Swarm Service",
						details: `Replicas: ${s.replicas}`,
					});
				}
			});

			return suggestions.slice(0, 50); // Limit results
		} catch (error) {
			this.logger.warn({
				message: `Error getting Docker suggestions: ${error.message}`,
				service: this.SERVICE_NAME,
				method: "getDockerSuggestions",
			});
			return [];
		}
	}

	async getDockerSuggestions({ teamId, q }) {
		try {
			const swarmManager = await this.getSwarmManagerForTeam(teamId);
			if (!swarmManager) {
				return [];
			}

			// Use remote Capture agent on a Swarm manager
			// Construct URL carefully. Assume agent URL is like http://host:port/api/v1/metrics
			let dockerUrl;
			if (swarmManager.url.includes("/api/v1/metrics")) {
				dockerUrl = swarmManager.url.replace(/\/metrics\/?$/, "/metrics/docker?all=true");
			} else {
				// Fallback: append path to url
				const baseUrl = swarmManager.url.replace(/\/$/, "");
				dockerUrl = `${baseUrl}/api/v1/metrics/docker?all=true`;
			}

			const config = {
				headers: swarmManager.secret ? { Authorization: `Bearer ${swarmManager.secret}` } : undefined,
			};

			if (swarmManager.ignoreTlsErrors) {
				config.agent = {
					https: new this.https.Agent({
						rejectUnauthorized: false,
					}),
				};
			}

			const res = await this.got(dockerUrl, config);
			if (!res.ok) {
				throw new Error(`Failed to fetch Docker data from manager ${swarmManager.name}`);
			}

			const dockerData = JSON.parse(res.body);
			const containers = dockerData?.data?.containers || [];
			const services = dockerData?.data?.swarm?.services || [];

			const query = q.toLowerCase();
			const suggestions = [];

			// Add matching containers
			containers.forEach((c) => {
				const name = c.container_name.toLowerCase();
				const id = c.container_id.toLowerCase();
				if (name.includes(query) || id.includes(query)) {
					suggestions.push({
						label: c.container_name,
						value: c.container_id, // Use full ID for precision
						type: "Container",
						details: `ID: ${c.container_id.substring(0, 12)}`,
					});
				}
			});

			// Add matching services
			services.forEach((s) => {
				const name = s.name.toLowerCase();
				const id = s.id.toLowerCase();
				if (name.includes(query) || id.includes(query)) {
					suggestions.push({
						label: s.name,
						value: s.name, // Services are usually referenced by name
						type: "Swarm Service",
						details: `Replicas: ${s.replicas}`,
					});
				}
			});

			return suggestions.slice(0, 50); // Limit results
		} catch (error) {
			this.logger.warn({
				message: `Error getting Docker suggestions: ${error.message}`,
				service: this.SERVICE_NAME,
				method: "getDockerSuggestions",
			});
			return [];
		}
	}

	async requestDocker(monitor) {
		try {
			if (!monitor.url) {
				throw new Error("Monitor URL is required");
			}

			// --- Swarm-Aware Routing Logic ---
			const swarmManager = await this.getSwarmManagerForTeam(monitor.teamId);

			if (swarmManager) {
				// Use remote Capture agent on a Swarm manager
				try {
					const dockerUrl = swarmManager.url.replace(/\/metrics\/?$/, "/metrics/docker?all=true");
					const config = {
						headers: swarmManager.secret ? { Authorization: `Bearer ${swarmManager.secret}` } : undefined,
					};

					if (swarmManager.ignoreTlsErrors) {
						config.agent = {
							https: new this.https.Agent({
								rejectUnauthorized: false,
							}),
						};
					}

					const res = await this.got(dockerUrl, config);
					if (res.ok) {
						const dockerData = JSON.parse(res.body);
						const containers = dockerData?.data?.containers || [];
						const services = dockerData?.data?.swarm?.services || [];
						const nodes = dockerData?.data?.swarm?.nodes || [];
						
						// Normalize input for matching
						const normalizedInput = monitor.url.replace(/^\/+/, "").toLowerCase();
						
						// 1. Try finding a specific container first
						const targetContainer = containers.find(c => 
							c.container_id.toLowerCase() === normalizedInput ||
							c.container_name.toLowerCase() === normalizedInput ||
							c.container_id.toLowerCase().startsWith(normalizedInput)
						);

						if (targetContainer) {
							return {
								monitorId: monitor.id,
								teamId: monitor.teamId,
								type: monitor.type,
								status: targetContainer.running,
								code: 200,
								message: `Docker container status fetched from Swarm cluster via manager ${swarmManager.name}`,
								responseTime: res.timings.phases.total || 0,
								payload: targetContainer
							};
						}

						// 2. Fallback to finding a Swarm Service
						const targetService = services.find(s => 
							s.id.toLowerCase() === normalizedInput ||
							s.name.toLowerCase() === normalizedInput
						);

						if (targetService) {
							let status = false;
							let msg = "";
							const replicas = targetService.replicas || 0;
							const running = targetService.running_tasks || 0;

							if (running === replicas && replicas > 0) {
								status = true; // UP
								msg = `Swarm service ${targetService.name} is healthy (${running}/${replicas} replicas)`;
							} else if (running > 0) {
								status = "degraded"; // DEGRADED
								msg = `Swarm service ${targetService.name} is degraded (${running}/${replicas} replicas)`;
							} else {
								status = false; // DOWN
								msg = `Swarm service ${targetService.name} is down (0/${replicas} replicas)`;
							}

							return {
								monitorId: monitor.id,
								teamId: monitor.teamId,
								type: monitor.type,
								status: status,
								code: 200,
								message: msg,
								responseTime: res.timings.phases.total || 0,
								payload: targetService
							};
						}
					}
				} catch (swarmErr) {
					this.logger.warn({
						message: `Failed to fetch Docker status from Swarm manager ${swarmManager.id}: ${swarmErr.message}`,
						service: this.SERVICE_NAME,
						method: "requestDocker",
					});
					// Fallback to local check if remote fails
				}
			}

			// Default: Local socket check
			const docker = new this.Docker({
				socketPath: "/var/run/docker.sock",
				handleError: true, // Enable error handling
			});

			const dockerResponse = {
				monitorId: monitor.id,
				teamId: monitor.teamId,
				type: monitor.type,
			};

			const containers = await docker.listContainers({ all: true });

			// Normalize input: strip leading slashes and convert to lowercase for comparison
			const normalizedInput = monitor.url.replace(/^\/+/, "").toLowerCase();

			// Priority-based matching to avoid ambiguity:
			// 1. Exact full ID match (64-char)
			let exactIdMatch = containers.find((c) => c.Id.toLowerCase() === normalizedInput);

			// 2. Exact container name match (case-insensitive)
			let exactNameMatch = containers.find((c) =>
				c.Names.some((name) => {
					const cleanName = name.replace(/^\/+/, "").toLowerCase();
					return cleanName === normalizedInput;
				})
			);

			// 3. Partial ID match (fallback for backwards compatibility)
			let partialIdMatch = containers.find((c) => c.Id.toLowerCase().startsWith(normalizedInput));

			// Select container based on priority
			let targetContainer = exactIdMatch || exactNameMatch || partialIdMatch;

			// Return negative response if no container
			if (!targetContainer) {
				this.logger.warn({
					message: `No container found for "${monitor.url}".`,
					service: this.SERVICE_NAME,
					method: "requestDocker",
					details: { url: monitor.url },
				});

				dockerResponse.code = 404;
				dockerResponse.status = false;
				dockerResponse.message = this.stringService.dockerNotFound;
				return dockerResponse;
			}

			// Return negative response if ambiguous matches exist
			const matchTypes = [];
			if (exactIdMatch) matchTypes.push("exact ID");
			if (exactNameMatch) matchTypes.push("exact name");
			if (partialIdMatch && !exactIdMatch) matchTypes.push("partial ID");

			if (matchTypes.length > 1) {
				this.logger.warn({
					message: `Ambiguous container match for "${monitor.url}". Matched by: ${matchTypes.join(", ")}. Using ${exactIdMatch ? "exact ID" : exactNameMatch ? "exact name" : "partial ID"} match.`,
					service: this.SERVICE_NAME,
					method: "requestDocker",
					details: { url: monitor.url },
				});
				dockerResponse.status = 404;
				dockerResponse.status = false;
				dockerResponse.message = `Ambiguous container match for "${monitor.url}". Matched by: ${matchTypes.join(", ")}. Using ${exactIdMatch ? "exact ID" : exactNameMatch ? "exact name" : "partial ID"} match.`;
				return dockerResponse;
			}

			const container = docker.getContainer(targetContainer.Id);
			const { response, responseTime, error } = await this.timeRequest(() => container.inspect());

			dockerResponse.responseTime = responseTime;
			dockerResponse.status = response?.State?.Status === "running" ? true : false;
			dockerResponse.code = 200;
			dockerResponse.message = "Docker container status fetched successfully";

			if (error) {
				dockerResponse.status = false;
				dockerResponse.code = error.statusCode || this.NETWORK_ERROR;
				dockerResponse.message = error.reason || "Failed to fetch Docker container information";
				return dockerResponse;
			}

			return dockerResponse;
		} catch (err) {
			err.service = this.SERVICE_NAME;
			err.method = "requestDocker";
			throw err;
		}
	}

	async requestPort(monitor) {
		try {
			const { url, port } = monitor;
			const { response, responseTime, error } = await this.timeRequest(async () => {
				return new Promise((resolve, reject) => {
					const socket = this.net.createConnection(
						{
							host: url,
							port,
						},
						() => {
							socket.end();
							socket.destroy();
							resolve({ success: true });
						}
					);

					socket.setTimeout(5000);
					socket.on("timeout", () => {
						socket.destroy();
						reject(new Error("Connection timeout"));
					});

					socket.on("error", (err) => {
						socket.destroy();
						reject(err);
					});
				});
			});

			const portResponse = {
				code: 200,
				status: response.success,
				message: this.stringService.portSuccess,
				monitorId: monitor.id,
				teamId: monitor.teamId,
				type: monitor.type,
				responseTime: responseTime,
			};

			if (error) {
				portResponse.code = this.NETWORK_ERROR;
				portResponse.status = false;
				portResponse.message = this.stringService.portFail;
				return portResponse;
			}

			return portResponse;
		} catch (error) {
			error.service = this.SERVICE_NAME;
			error.method = "requestTCP";
			throw error;
		}
	}

	async requestGame(monitor) {
		try {
			const { url, port, gameId } = monitor;

			const gameResponse = {
				code: 200,
				status: true,
				message: "Success",
				monitorId: monitor.id,
				teamId: monitor.teamId,
				type: "game",
			};

			const state = await this.GameDig.query({
				type: gameId,
				host: url,
				port: port,
			}).catch((error) => {
				this.logger.warn({
					message: error.message,
					service: this.SERVICE_NAME,
					method: "requestGame",
					details: { url, port, gameId },
				});
			});

			if (!state) {
				gameResponse.code = this.NETWORK_ERROR;
				gameResponse.status = false;
				gameResponse.message = "No response";
				return gameResponse;
			}

			gameResponse.responseTime = state.ping;
			gameResponse.payload = state;
			return gameResponse;
		} catch (error) {
			error.service = this.SERVICE_NAME;
			error.method = "requestPing";
			throw error;
		}
	}
	async handleUnsupportedType(type) {
		const err = new Error(`Unsupported type: ${type}`);
		err.service = this.SERVICE_NAME;
		err.method = "getStatus";
		throw err;
	}

	// Other network requests unrelated to monitoring:
	async requestWebhook(type, url, body) {
		try {
			const response = await this.axios.post(url, body, {
				headers: {
					"Content-Type": "application/json",
				},
			});

			return {
				type: "webhook",
				status: true,
				code: response.status,
				message: `Successfully sent ${type} notification`,
				payload: response.data,
			};
		} catch (error) {
			this.logger.warn({
				message: error.message,
				service: this.SERVICE_NAME,
				method: "requestWebhook",
			});

			return {
				type: "webhook",
				status: false,
				code: error.response?.status || this.NETWORK_ERROR,
				message: `Failed to send ${type} notification`,
				payload: error.response?.data,
			};
		}
	}

	async requestPagerDuty({ message, routingKey, monitorUrl }) {
		try {
			const response = await this.axios.post(`https://events.pagerduty.com/v2/enqueue`, {
				routing_key: routingKey,
				event_action: "trigger",
				payload: {
					summary: message,
					severity: "critical",
					source: monitorUrl,
					timestamp: new Date().toISOString(),
				},
			});

			if (response?.data?.status !== "success") return false;
			return true;
		} catch (error) {
			error.details = error.response?.data;
			error.service = this.SERVICE_NAME;
			error.method = "requestPagerDuty";
			throw error;
		}
	}

	async requestMatrix({ homeserverUrl, accessToken, roomId, message }) {
		try {
			const url = `${homeserverUrl}/_matrix/client/v3/rooms/${roomId}/send/m.room.message?access_token=${accessToken}`;
			const body = {
				msgtype: "m.text",
				body: message,
				format: "org.matrix.custom.html",
				formatted_body: message,
			};
			const response = await this.axios.post(url, body, {
				headers: {
					"Content-Type": "application/json",
				},
			});

			return {
				status: true,
				code: response.status,
				message: "Successfully sent Matrix notification",
			};
		} catch (error) {
			this.logger.warn({
				message: error.message,
				service: this.SERVICE_NAME,
				method: "requestMatrix",
			});

			return {
				status: false,
				code: error.response?.status || this.NETWORK_ERROR,
				message: "Failed to send Matrix notification",
				payload: error.response?.data,
			};
		}
	}
}

export default NetworkService;
