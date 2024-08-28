import CloseIcon from "@/icons/CloseIcon.jsx";
import DocsIcon from "@/icons/DocsIcon.jsx";
import GithubIcon from "@/icons/GithubIcon.jsx";
import MenuIcon from "@/icons/MenuIcon.jsx";
import ShieldIcon from "@/icons/ShieldIcon.jsx";
import { useCallback, useState } from "preact/compat";

import DarkModeButton from "./DarkModeButton.jsx";
import NavLink from "./NavLink.jsx";
import PrivacyButton from "./Privacy.jsx";

export default function NavMenu() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const toggleMenu = useCallback(() => {
		setIsMenuOpen((x) => !x);
	}, []);

	return (
		<>
			<div>
				<label
					htmlFor="menu-toggle"
					className="btn btn-ghost btn-circle text-2xl lg:hidden"
				>
					{isMenuOpen ? <CloseIcon /> : <MenuIcon />}
				</label>
				<input
					className="hidden"
					type="checkbox"
					id="menu-toggle"
					checked={isMenuOpen}
					onChange={toggleMenu}
				/>
			</div>
			<ul
				className={[
					"z-50 w-full uppercase absolute left-0 top-full transition-all lg:h-auto lg:flex lg:static lg:p-0 lg:w-auto lg:items-center lg:opacity-100",
					isMenuOpen
						? "h-64 flex flex-wrap p-2 bg-inherit rounded-b-xl"
						: "opacity-0 h-0 overflow-hidden",
				].join(" ")}
			>
				<li className="w-full lg:w-auto">
					<NavLink
						href="https://github.com/binhtran432k/ungrammar-language-features/blob/main/README.md"
						className="btn btn-ghost w-full"
					>
						<DocsIcon className="text-2xl" /> Documentation
					</NavLink>
				</li>
				<li className="w-full lg:w-auto">
					<PrivacyButton className="btn btn-ghost w-full">
						<ShieldIcon className="text-2xl" /> Security
					</PrivacyButton>
				</li>
				<li className="w-full lg:w-auto">
					<NavLink
						href="https://github.com/binhtran432k/ungrammar-language-features"
						className="btn btn-ghost w-full"
					>
						<GithubIcon className="text-2xl" />
						<span className="inline lg:hidden">Github</span>
					</NavLink>
				</li>
				<li className="w-full lg:w-auto">
					<DarkModeButton className="btn btn-ghost w-full" />
				</li>
			</ul>
		</>
	);
}
