import JobForm from "@components/JobForm";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm" data-testid="home-create-section">
        <h1 className="text-2xl font-semibold" data-testid="home-title">Create a summary</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload an audio/video file or paste a YouTube URL. Pick the summary
          level and go.
        </p>
        <div className="mt-6">
          <JobForm />
        </div>
      </section>
    </div>
  );
}
