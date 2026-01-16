import { Stack, Typography, Box } from "@mui/material";
import DataTable from "@/Components/v1/Table/index.jsx";
import { StatusLabel } from "@/Components/v1/Label/index.jsx";
import { useTheme } from "@emotion/react";
import { useTranslation } from "react-i18next";

const SwarmClusterOverview = ({ swarm }) => {
	const theme = useTheme();
	const { t } = useTranslation();

	if (!swarm) return null;

	const nodeHeaders = [
		{ id: "hostname", content: t("hostname") },
		{ id: "role", content: t("role") },
		{
			id: "status",
			content: t("status"),
			render: (row) => (
				<StatusLabel
					status={row.status === "ready" || row.status === "active"}
					text={row.status}
				/>
			),
		},
		{ id: "availability", content: t("availability") },
	];

	const serviceHeaders = [
		{ id: "name", content: t("name") },
		{ id: "image", content: t("image") },
		{ id: "replicas", content: t("replicas"), align: "center" },
		{ id: "running", content: t("running"), align: "center" },
	];

	const nodeData = swarm.nodes?.map((node) => ({
		id: node.id,
		hostname: node.hostname,
		role: node.role,
		status: node.status,
		availability: node.availability,
	})) || [];

	const serviceData = swarm.services?.map((service) => ({
		id: service.id,
		name: service.name,
		image: service.image,
		replicas: service.replicas,
		running: service.running_tasks,
	})) || [];

	return (
		<Stack gap={theme.spacing(6)}>
			<Box>
				<Typography variant="h4" gutterBottom>{t("swarmNodes")}</Typography>
				<DataTable
					headers={nodeHeaders}
					data={nodeData}
					shouldRender={true}
					config={{ emptyView: t("noNodesFound") }}
				/>
			</Box>
			<Box>
				<Typography variant="h4" gutterBottom>{t("swarmServices")}</Typography>
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
