export default function Card({
	title,
	children,
}: React.PropsWithChildren<{ title: string }>) {
	return (
		<section className="card m-2 flex flex-grow bg-base-300 flex-col overflow-hidden shadow-xl">
			<div className="px-4 py-2">
				<h3 className="card-title">{title}</h3>
			</div>
			<div className="card-body flex-grow overflow-auto p-0 text-base-content">
				{children}
			</div>
		</section>
	);
}
