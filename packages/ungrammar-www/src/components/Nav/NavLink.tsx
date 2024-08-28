export default function NavLink({
	href,
	isCurrent,
	locationPath,
	...props
}: {
	href: string;
	locationPath?: string;
	isCurrent?: boolean;
	[k: string]: unknown;
}) {
	const isExternalLink = href ? href.startsWith("http") : false;
	const isAriaCurrent = (locationPath === href && !isCurrent) || isCurrent;

	return (
		<a
			href={href}
			{...(isAriaCurrent && { "aria-current": "page" })}
			{...(isExternalLink && { target: "_blank", rel: "noopener noreferrer" })}
			{...props}
		/>
	);
}
