import { Box, Typography, Stack, Tooltip } from "@mui/material";
import DataTable from "@/Components/v1/Table/index.jsx";
import { StatusLabel } from "@/Components/v1/Label/index.jsx";
import CustomGauge from "@/Components/v1/Charts/CustomGauge/index.jsx";
import { useTheme } from "@emotion/react";
import { useTranslation } from "react-i18next";

const SwarmContainerList = ({ containers }) => {
	const theme = useTheme();
	const { t } = useTranslation();

	const headers = [
		{ id: "name", content: t("name"), render: (row) => row.name },
		{
			id: "status",
			content: t("status"),
			render: (row) => (
				<StatusLabel
					status={row.running ? "up" : "down"}
					text={row.status}
				/>
			),
		},
		{ id: "agent", content: t("agent"), render: (row) => row.agent },
		{ id: "cpu", content: t("cpu"), render: (row) => <CustomGauge progress={row.cpu} /> },
		{ id: "memory", content: t("memory"), render: (row) => <CustomGauge progress={row.mem} /> },
		{ id: "net_io", content: t("networkIO"), render: (row) => row.net_io },
		{ id: "block_io", content: t("blockIO"), render: (row) => row.block_io },
	];

	const formatBytes = (bytes) => {
		if (!bytes) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	const data = containers?.map((c) => ({
		id: c.container_id,
		name: c.container_name,
		status: c.status,
		running: c.running,
		agent: c.agent_name,
		cpu: (c.stats?.cpu_percent ?? 0),
		mem: (c.stats?.memory_percent ?? 0),
		net_io: `${formatBytes(c.stats?.network_rx_bytes)} / ${formatBytes(c.stats?.network_tx_bytes)}`,
		block_io: `${formatBytes(c.stats?.block_read_bytes)} / ${formatBytes(c.stats?.block_write_bytes)}`,
	})) || [];

	return (
		<Box sx={{ width: "100%", overflowX: "auto" }}>
			<Typography
				variant="h4"
				gutterBottom
			>
				{t("swarmContainers")}
			</Typography>
			<DataTable
				headers={headers}
				data={data}
				shouldRender={true}
				config={{
					emptyView: t("noContainersFound"),
					headerSX: { textTransform: "capitalize" },
				}}
			/>
		</Box>
	);
};

export default SwarmContainerList;
