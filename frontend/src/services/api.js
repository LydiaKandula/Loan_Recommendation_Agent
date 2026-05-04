const BASE_URL = "http://localhost:8000";

export const startAgent = async (data) => {
  const res = await fetch(`${BASE_URL}/start-agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Backend error");
  }

  return res.json();
};