import PropTypes from "prop-types";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material";
import "./index.css";

/**
 * @typedef {Object} Styles
 * @param {string} [color] - The text color
 * @param {string} [backgroundColor] - The background color
 * @param {string} [borderColor] - The border color
 */

/**
 * @component
 * @param {Object} props
 * @param {string} props.label - The label of the label
 * @param {Styles} props.styles - CSS Styles passed from parent component
 * @param {React.ReactNode} children - Children passed from parent component
 * @returns {JSX.Element}
 */

const BaseLabel = ({ label, styles, children }) => {
	const theme = useTheme();
	// Grab the default borderRadius from the theme to match button style
	const { borderRadius } = theme.shape || { borderRadius: 4 };
	// Calculate padding for the label to mimic button.  Appears to scale correctly, not 100% sure though.
	const padding = theme.spacing(3, 5);

	return (
		<Box
			className="label"
			sx={{
				borderRadius: borderRadius,
				border: `1px solid ${theme.palette.primary?.lowContrast || "#dddddd"}`,
				color: theme.palette.primary?.contrastText || "#000000",
				padding: padding,
				...styles,
			}}
		>
			{children}
			{label}
		</Box>
	);
};

// ... (keep lightenColor and ColoredLabel as is, or add same checks if needed)

const StatusLabel = ({ status, text, customStyles }) => {
	const theme = useTheme();

	const themeColor = statusToTheme[status] || "primary";
	const paletteColor = theme.palette[themeColor] || theme.palette.primary;

	return (
		<BaseLabel
			label={text}
			styles={{
				color: paletteColor?.main || "#000000",
				borderColor: paletteColor?.lowContrast || "#dddddd",
				...customStyles,
			}}
		>
			<Box
				bgcolor={paletteColor?.lowContrast || "#dddddd"}
				borderRadius="0%"
				marginRight="1px"
			/>
		</BaseLabel>
	);
};

StatusLabel.propTypes = {
	status: PropTypes.oneOf([
		"up",
		"down",
		"paused",
		"pending",
		"cannot resolve",
		"published",
		"unpublished",
	]),
	text: PropTypes.string,
	customStyles: PropTypes.object,
};

export { BaseLabel, ColoredLabel, StatusLabel };
