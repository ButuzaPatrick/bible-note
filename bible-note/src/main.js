fetch("http://localhost:8000/ping")
  .then(res => res.json())
  .then(data => console.log("API says:", data));