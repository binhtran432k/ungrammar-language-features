import DarkModeIcon from "@/icons/DarkModeIcon.jsx";
import LightModeIcon from "@/icons/LightModeIcon.jsx";
import { isThemeDark } from "@/store.js";
import { setThemeDark } from "@/utils/darkMode.js";
import { useStore } from "@nanostores/preact";
import { memo, useEffect } from "preact/compat";

import NavLink from "./NavLink.jsx";

const DarkModeButton = memo(({ className }: { className?: string }) => {
	const $isThemeDark = useStore(isThemeDark);

	const handleSwitchTheme = (e: React.TargetedEvent) => {
		e.preventDefault();
		isThemeDark.set(!$isThemeDark);
	};

	useEffect(() => {
		setThemeDark($isThemeDark);
	}, [$isThemeDark]);

	return (
		<NavLink
			onClick={handleSwitchTheme}
			href="#"
			aria-label={$isThemeDark ? "Turn off dark mode" : "Turn on dark mode"}
			className={className}
		>
			{$isThemeDark ? (
				<DarkModeIcon className="text-2xl" />
			) : (
				<LightModeIcon className="text-2xl" />
			)}
			<span className="inline lg:hidden">
				{$isThemeDark ? "Dark" : "Light"}
			</span>
		</NavLink>
	);
});

export default DarkModeButton;
