import { useState } from "react";
import { supabase } from "../lib/supabase";

const API_BASE_URL = "http://localhost:8000";

export default function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setProfile(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("You must be signed in to upload a resume.");
      }

      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(`${API_BASE_URL}/resume/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const body = await uploadResponse.json().catch(() => ({}));
        throw new Error(body.detail || `Upload failed with status ${uploadResponse.status}`);
      }

      const uploadData = await uploadResponse.json();

      const profileResponse = await fetch(
        `${API_BASE_URL}/resume/profile/${uploadData.profile_id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!profileResponse.ok) {
        const body = await profileResponse.json().catch(() => ({}));
        throw new Error(body.detail || `Fetching profile failed with status ${profileResponse.status}`);
      }

      const profileData = await profileResponse.json();
      setProfile(profileData);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Upload Resume</h1>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files[0])}
        className="mb-4"
      />

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
      >
        {loading ? "Processing..." : "Upload & Extract"}
      </button>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {profile && (
        <div className="mt-6 border rounded p-4">
          <h2 className="font-medium">{profile.full_name}</h2>
          <p className="text-sm text-gray-600">
            {profile.email} · {profile.phone}
          </p>
          <p className="mt-2">{profile.summary}</p>

          <h3 className="mt-4 font-medium">Skills</h3>
          <ul className="list-disc pl-5">
            {profile.skills.map((s) => (
              <li key={s.id}>
                {s.skill_name} ({s.category})
              </li>
            ))}
          </ul>

          <h3 className="mt-4 font-medium">Projects</h3>
          <ul className="list-disc pl-5">
            {profile.projects.map((p) => (
              <li key={p.id}>
                <strong>{p.title}</strong>: {p.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}