import CloseIcon from "@/icons/CloseIcon.js";

export default function PrivacyButton({
	children,
	...props
}: React.PropsWithChildren<{ className?: string }>) {
	return (
		<>
			<label htmlFor="privacyModal" {...props}>
				{children}
			</label>
			<input type="checkbox" id="privacyModal" className="modal-toggle" />
			<div className="modal normal-case" role="dialog">
				<div className="modal-box flex flex-col gap-3">
					<h1 className="text-3xl font-bold mb-3">Data security</h1>
					<p>
						<span className="text-xl font-bold">
							The content of the editor you create never leaves your browser.
						</span>{" "}
						It's stored in the browser's local storage only.
					</p>
					<p>
						Ungrammar Language Features live editor is a fully client side
						application, that will also work as an offline{" "}
						<a
							href="https://web.dev/explore/progressive-web-apps"
							className="link"
							target="_blank"
							rel="noreferrer"
						>
							PWA.
						</a>
					</p>

					<label
						className="btn btn-circle btn-ghost btn-sm absolute right-2 top-2"
						htmlFor="privacyModal"
					>
						<CloseIcon className="text-2xl" />
					</label>
				</div>
			</div>
		</>
	);
}
