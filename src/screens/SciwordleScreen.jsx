export default function SciwordleScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mb-8 rotate-12">
        <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center -rotate-12">
          <span className="text-4xl font-bold text-primary">W</span>
        </div>
      </div>
      
      <h1 className="text-5xl font-bold text-text mb-4">Sciwordle</h1>
      <p className="text-sub text-xl max-w-lg mb-10">
        The daily scientific vocabulary challenge. Coming soon to the web platform.
      </p>

      <button className="bg-surface border border-border/50 text-text px-8 py-3 rounded-xl font-medium opacity-50 cursor-not-allowed">
        Play Daily Puzzle
      </button>
    </div>
  );
}
