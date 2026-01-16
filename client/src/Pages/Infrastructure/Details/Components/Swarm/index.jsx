import { Stack } from "@mui/material";
import SwarmClusterOverview from "./SwarmClusterOverview.jsx";
import SwarmContainerList from "./SwarmContainerList.jsx";
import { useTheme } from "@emotion/react";

const SwarmDetails = ({ cluster, isLoading }) => {
	const theme = useTheme();

	if (isLoading || !cluster) return null;

	return (
		<Stack gap={theme.spacing(10)} marginTop={theme.spacing(4)}>
			<SwarmClusterOverview swarm={cluster.swarm} />
			<SwarmContainerList containers={cluster.containers} />
		</Stack>
	);
};

export default SwarmDetails;
