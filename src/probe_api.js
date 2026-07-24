async function probe() {
  const BASE_URL = "https://l8w7k68xt5.execute-api.us-east-1.amazonaws.com";
  const paths = [
    "/departments",
    "/admin/departments",
    "/department",
    "/departments/list",
    "/api/departments",
    "/admin/users",
  ];

  for (const path of paths) {
    try {
      console.log(`\nProbing GET ${BASE_URL}${path}...`);
      const res = await fetch(`${BASE_URL}${path}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      });
      console.log(`Status: ${res.status}`);
      const text = await res.text();
      console.log(`Response snippet: ${text.slice(0, 400)}`);
    } catch (err) {
      console.error(`Error probing ${path}:`, err.message);
    }
  }
}

probe();
