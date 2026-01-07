import BoardGenerator from "./components/main/generator"

function HeroHeading() {
	return (
		<div className="flex flex-col items-center py-12">
			<div className="text-9xl font-bold leading-24">
				Octa-Bingo
			</div>
			<div className="text-xl">
				A smart, creative bingo-board generator
			</div>
		</div>
	)
}

export default function App() {
	return (
		<div>
			<HeroHeading />
			<BoardGenerator />
		</div>
	)
}