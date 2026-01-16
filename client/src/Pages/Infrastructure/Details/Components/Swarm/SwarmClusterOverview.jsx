import { Stack, Typography, Box, Tooltip } from "@mui/material";
import DataTable from "@/Components/v1/Table/index.jsx";
import { StatusLabel } from "@/Components/v1/Label/index.jsx";
import { useTheme } from "@emotion/react";
import { useTranslation } from "react-i18next";

const SwarmClusterOverview = ({ swarm }) => {
	const theme = useTheme();
	const { t } = useTranslation();

	if (!swarm) return null;

	const nodeHeaders = [
		{ id: "hostname", content: t("hostname"), render: (row) => row.hostname },
		{ id: "role", content: t("role"), render: (row) => row.role },
		{
			id: "status",
			content: t("status"),
			render: (row) => (
				<StatusLabel
					status={row.status === "ready" || row.status === "active" ? "up" : "down"}
					text={row.status}
				/>
			),
		},
		{ id: "availability", content: t("availability"), render: (row) => row.availability },
	];

	const serviceHeaders = [
		{ id: "name", content: t("name"), render: (row) => row.name },
		{
			id: "image",
			content: t("image"),
			render: (row) => {
				const shortImage = row.image?.split("@")[0] || "Unknown";
				return (
					<Tooltip title={row.image || ""}>
						<Typography
							variant="body2"
							sx={{
								maxWidth: "250px",
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
							}}
						>
							{shortImage}
						</Typography>
					</Tooltip>
				);
			},
		},
		{
			id: "mode",
			content: t("mode"),
			render: (row) => (
				<Typography
					variant="body2"
					sx={{ textTransform: "capitalize" }}
				>
					{row.mode}
				</Typography>
			),
		},
		{
			id: "replicas",
			content: t("replicas"),
			align: "center",
			render: (row) => (row.mode === "global" ? t("global") : row.replicas),
		},
		{ id: "running", content: t("running"), align: "center", render: (row) => row.running },
	];

	const nodeData = swarm.nodes?.map((node) => ({
		id: node.id || Math.random().toString(),
		hostname: node.hostname || "Unknown",
		role: node.role || "Unknown",
		status: node.status || "Unknown",
		availability: node.availability || "Unknown",
	})) || [];

	const serviceData =
		swarm.services?.map((service) => ({
			id: service.id || Math.random().toString(),
			name: service.name || "Unknown",
			image: service.image || "Unknown",
			mode: service.mode || "replicated",
			replicas: service.replicas || 0,
			running: service.running_tasks || 0,
		})) || [];

	return (
		<Stack gap={theme.spacing(6)}>
			<Box sx={{ width: "100%", overflowX: "auto" }}>
				<Typography
					variant="h4"
					gutterBottom
				>
					{t("swarmNodes")}
				</Typography>
				<DataTable
					headers={nodeHeaders}
					data={nodeData}
					shouldRender={true}
					config={{ emptyView: t("noNodesFound") }}
				/>
			</Box>
			<Box sx={{ width: "100%", overflowX: "auto" }}>
				<Typography
					variant="h4"
					gutterBottom
				>
					{t("swarmServices")}
				</Typography>
				<DataTable
					headers={serviceHeaders}
					data={serviceData}
					shouldRender={true}
					config={{ emptyView: t("noServicesFound") }}
				/>
			</Box>
		</Stack>
	);
};

export default SwarmClusterOverview;
