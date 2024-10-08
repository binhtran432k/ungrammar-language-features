export default function DocsIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="1em"
			height="1em"
			viewBox="0 0 24 24"
			{...props}
		>
			<title>Docs</title>
			<path
				fill="currentColor"
				d="M8 13h8v-2H8Zm0 3h8v-2H8Zm0 3h5v-2H8Zm-2 3q-.825 0-1.412-.587Q4 20.825 4 20V4q0-.825.588-1.413Q5.175 2 6 2h8l6 6v12q0 .825-.587 1.413Q18.825 22 18 22Zm7-13h5l-5-5Z"
			/>
		</svg>
	);
}
