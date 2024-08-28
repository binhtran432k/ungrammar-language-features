await Bun.$`rm -rf public/examples`;
await Bun.$`cp -r ../../examples public/examples`;
await Bun.$`cp -f ../../icons/ungram.svg public/favicon.svg`;

export type {};
