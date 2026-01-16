import { useState, useEffect, useMemo } from "react";
import { Autocomplete, TextField, CircularProgress, Typography, Stack, Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { networkService } from "../../../../main.jsx";
import { useTheme } from "@emotion/react";
import PropTypes from "prop-types";
import FieldWrapper from "../FieldWrapper/index.jsx";
import { createToast } from "../../../../Utils/toastUtils.jsx";

const DockerAutocomplete = ({
	value,
	onChange,
	label,
	error,
	helperText,
	disabled,
	placeholder,
	name,
}) => {
	const [open, setOpen] = useState(false);
	const [options, setOptions] = useState([]);
	const [loading, setLoading] = useState(false);
	const [inputValue, setInputValue] = useState(value || "");
	const theme = useTheme();
	const { t } = useTranslation();

	useEffect(() => {
		setInputValue(value || "");
	}, [value]);

	useEffect(() => {
		let active = true;

		if (!inputValue) {
			setOptions([]);
			return undefined;
		}

		const fetchSuggestions = async () => {
			setLoading(true);
			try {
				const res = await networkService.getDockerSuggestions({ q: inputValue });
				if (active && res.data.success) {
					setOptions(res.data.data);
				}
			} catch (err) {
				console.error("Failed to fetch Docker suggestions", err);
				// Don't show error toast on every keystroke, just log
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		};

		const timeoutId = setTimeout(() => {
			fetchSuggestions();
		}, 500); // 500ms debounce

		return () => {
			active = false;
			clearTimeout(timeoutId);
		};
	}, [inputValue, value]);

	const Required = () => (
		<Typography
			component="span"
			ml={theme.spacing(1)}
			color={theme.palette.error.main}
		>
			*
		</Typography>
	);

	return (
		<FieldWrapper label={<>{label}<Required/></>}>
			<Autocomplete
				id="docker-autocomplete"
				open={open}
				onOpen={() => setOpen(true)}
				onClose={() => setOpen(false)}
				isOptionEqualToValue={(option, value) => option.value === value}
				getOptionLabel={(option) => option.label || option}
				options={options}
				loading={loading}
				value={value}
				inputValue={inputValue}
				onInputChange={(event, newInputValue) => {
					setInputValue(newInputValue);
					// If user clears input or types something different, update parent
					// Note: Autocomplete usually handles selection separately, 
					// but for free solo or text input behavior we might want to propagate changes.
					// However, standard behavior is onChange called on selection.
					// Here we allow free text by propagating input changes if needed, 
					// but let's stick to selection for now or allow free text via onChange
					onChange({ target: { name, value: newInputValue } });
				}}
				onChange={(event, newValue) => {
					if (newValue) {
						onChange({ target: { name, value: newValue.value } });
					}
				}}
				renderInput={(params) => (
					<TextField
						{...params}
						placeholder={placeholder}
						error={error}
						helperText={helperText}
						disabled={disabled}
						slotProps={{
							input: {
								...params.InputProps,
								endAdornment: (
									<>
										{loading ? <CircularProgress color="inherit" size={20} /> : null}
										{params.InputProps.endAdornment}
									</>
								),
							},
						}}
					/>
				)}
				renderOption={(props, option) => {
					// Extract key from props to avoid React warning
					const { key, ...otherProps } = props;
					return (
						<li key={key} {...otherProps}>
							<Stack>
								<Typography variant="body1">{option.label}</Typography>
								<Stack direction="row" gap={1}>
									<Typography variant="caption" color="text.secondary">
										{option.type}
									</Typography>
									<Typography variant="caption" color="text.secondary">
										•
									</Typography>
									<Typography variant="caption" color="text.secondary">
										{option.details}
									</Typography>
								</Stack>
							</Stack>
						</li>
					);
				}}
				filterOptions={(x) => x} // Disable client-side filtering
				freeSolo // Allow typing custom values
			/>
		</FieldWrapper>
	);
};

DockerAutocomplete.propTypes = {
	value: PropTypes.string,
	onChange: PropTypes.func.isRequired,
	label: PropTypes.string,
	error: PropTypes.bool,
	helperText: PropTypes.string,
	disabled: PropTypes.bool,
	placeholder: PropTypes.string,
	name: PropTypes.string.isRequired,
};

export default DockerAutocomplete;
